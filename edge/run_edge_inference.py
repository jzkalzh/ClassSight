from __future__ import annotations

import os
import time
from collections import defaultdict
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any

import cv2
from dotenv import load_dotenv
from ultralytics import YOLO

from client import from_env


BEHAVIOR_LABELS = {
    0: "person",
    1: "hand_raise",
    2: "look_up",
    3: "focus",
}


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


@dataclass
class StudentAccumulator:
    tracker_id: str
    frame_count: int = 0
    look_up_hits: int = 0
    focus_hits: int = 0
    hand_raise_count: int = 0
    present: bool = False

    def to_metric(self) -> dict[str, Any]:
        frames = max(self.frame_count, 1)
        attendance_rate = 100.0 if self.present else 0.0
        look_up_rate = round(self.look_up_hits / frames * 100, 2)
        focus_level = round(self.focus_hits / frames * 100, 2)
        return {
            "trackerId": self.tracker_id,
            "displayName": self.tracker_id,
            "attendanceRate": attendance_rate,
            "lookUpRate": look_up_rate,
            "focusLevel": focus_level,
            "participationCount": self.hand_raise_count,
        }


@dataclass
class BatchBuffer:
    events: list[dict[str, Any]] = field(default_factory=list)
    students: dict[str, StudentAccumulator] = field(default_factory=dict)

    def touch_student(self, tracker_id: str) -> StudentAccumulator:
        if tracker_id not in self.students:
            self.students[tracker_id] = StudentAccumulator(tracker_id=tracker_id)
        return self.students[tracker_id]

    def build_payload(self) -> tuple[list[dict[str, Any]], list[dict[str, Any]], dict[str, Any]]:
        student_metrics = [student.to_metric() for student in self.students.values()]
        total_students = len(student_metrics)

        def avg(key: str) -> float:
            if not student_metrics:
                return 0.0
            return round(sum(float(item[key]) for item in student_metrics) / total_students, 2)

        class_metric = {
            "avgAttendance": avg("attendanceRate"),
            "avgLookUpRate": avg("lookUpRate"),
            "avgFocusLevel": avg("focusLevel"),
            "avgParticipationCount": avg("participationCount"),
            "totalStudents": total_students,
        }
        return self.events, student_metrics, class_metric

    def reset_events(self) -> None:
        self.events = []


def main() -> None:
    load_dotenv()

    api_client = from_env()
    model = YOLO(os.getenv("YOLO_MODEL", "yolov8n.pt"))

    source_stream = os.getenv("SOURCE_STREAM", "0")
    capture_source: int | str = int(source_stream) if source_stream.isdigit() else source_stream
    batch_interval = int(os.getenv("BATCH_INTERVAL_SECONDS", "5"))

    session = api_client.start_session(
      course_id=os.getenv("COURSE_ID"),
      classroom=os.getenv("CLASSROOM"),
      source_stream=source_stream,
      metadata={"model": os.getenv("YOLO_MODEL", "yolov8n.pt")},
    )
    session_id = session["id"]
    print(f"Started session: {session_id}")

    cap = cv2.VideoCapture(capture_source)
    if not cap.isOpened():
        raise RuntimeError(f"Failed to open source: {source_stream}")

    buffer = BatchBuffer()
    last_upload_ts = time.time()

    try:
        while True:
            ok, frame = cap.read()
            if not ok:
                print("Frame read failed, retrying...")
                time.sleep(0.2)
                continue

            results = model.track(frame, persist=True, verbose=False)
            frame_ts = utc_now_iso()

            if results and results[0].boxes is not None:
                boxes = results[0].boxes
                ids = boxes.id.tolist() if boxes.id is not None else []
                classes = boxes.cls.tolist() if boxes.cls is not None else []
                confs = boxes.conf.tolist() if boxes.conf is not None else []
                coords = boxes.xyxy.tolist() if boxes.xyxy is not None else []

                if not ids:
                    ids = list(range(len(coords)))

                for tracker_raw, cls_raw, conf_raw, bbox in zip(ids, classes, confs, coords):
                    tracker_id = f"track-{int(tracker_raw)}"
                    behavior = BEHAVIOR_LABELS.get(int(cls_raw), "person")
                    student = buffer.touch_student(tracker_id)
                    student.frame_count += 1
                    student.present = True

                    if behavior == "look_up":
                        student.look_up_hits += 1
                    elif behavior == "focus":
                        student.focus_hits += 1
                    elif behavior == "hand_raise":
                        student.hand_raise_count += 1

                    buffer.events.append(
                        {
                            "trackerId": tracker_id,
                            "behaviorType": behavior if behavior != "person" else "attendance",
                            "confidence": round(float(conf_raw), 4),
                            "frameTs": frame_ts,
                            "bbox": {
                                "x1": bbox[0],
                                "y1": bbox[1],
                                "x2": bbox[2],
                                "y2": bbox[3],
                            },
                        }
                    )

            now = time.time()
            if now - last_upload_ts >= batch_interval:
                events, student_metrics, class_metric = buffer.build_payload()
                api_client.upload_batch(
                    session_id=session_id,
                    events=events,
                    student_metrics=student_metrics,
                    class_metric=class_metric,
                )
                print(
                    f"Uploaded batch: events={len(events)}, students={len(student_metrics)}"
                )
                buffer.reset_events()
                last_upload_ts = now

    except KeyboardInterrupt:
        print("Stopping inference...")
    finally:
        cap.release()
        remaining_events, student_metrics, class_metric = buffer.build_payload()
        if remaining_events or student_metrics:
            api_client.upload_batch(
                session_id=session_id,
                events=remaining_events,
                student_metrics=student_metrics,
                class_metric=class_metric,
            )
        api_client.close_session(session_id=session_id)
        print(f"Closed session: {session_id}")


if __name__ == "__main__":
    main()
