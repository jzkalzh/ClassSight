from __future__ import annotations

import json
import os
import time
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import cv2
from dotenv import load_dotenv
from ultralytics import YOLO

from client import from_env


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


@dataclass
class AttendanceRecord:
    student_id: str
    display_name: str
    first_seen_at: str
    confidence: float
    seen_count: int = 1


def load_roster(path: str | None) -> dict[str, dict[str, str]]:
    if not path:
        return {}

    roster_path = Path(path)
    if not roster_path.exists():
        raise FileNotFoundError(f"Roster file not found: {roster_path}")

    with roster_path.open("r", encoding="utf-8") as file:
        return json.load(file)


def resolve_student(
    label: str,
    roster: dict[str, dict[str, str]],
) -> tuple[str | None, str | None]:
    if label in roster:
        return roster[label].get("studentId"), roster[label].get("displayName", label)

    if label.startswith("student-") or label.startswith("stu-") or label.isdigit():
        return label, label

    return None, None


def main() -> None:
    load_dotenv()

    api_client = from_env()
    model = YOLO(os.getenv("YOLO_MODEL", "yolov8n.pt"))
    source_stream = os.getenv("SOURCE_STREAM", "0")
    capture_source: int | str = int(source_stream) if source_stream.isdigit() else source_stream
    confidence_threshold = float(os.getenv("ATTENDANCE_CONFIDENCE", "0.6"))
    observe_seconds = int(os.getenv("ATTENDANCE_OBSERVE_SECONDS", "15"))
    roster = load_roster(os.getenv("ATTENDANCE_ROSTER_PATH"))

    session = api_client.start_session(
        course_id=os.getenv("COURSE_ID"),
        classroom=os.getenv("CLASSROOM"),
        source_stream=source_stream,
        metadata={
            "model": os.getenv("YOLO_MODEL", "yolov8n.pt"),
            "mode": "attendance",
        },
    )
    session_id = session["id"]
    print(f"Started attendance session: {session_id}")

    cap = cv2.VideoCapture(capture_source)
    if not cap.isOpened():
        raise RuntimeError(f"Failed to open source: {source_stream}")

    attendance: dict[str, AttendanceRecord] = {}
    events: list[dict[str, Any]] = []
    started_at = time.time()

    try:
        while time.time() - started_at < observe_seconds:
            ok, frame = cap.read()
            if not ok:
                time.sleep(0.1)
                continue

            results = model.predict(frame, verbose=False)
            frame_ts = utc_now_iso()

            if not results or results[0].boxes is None:
                continue

            boxes = results[0].boxes
            classes = boxes.cls.tolist() if boxes.cls is not None else []
            confs = boxes.conf.tolist() if boxes.conf is not None else []
            coords = boxes.xyxy.tolist() if boxes.xyxy is not None else []
            names = results[0].names

            for cls_raw, conf_raw, bbox in zip(classes, confs, coords):
                confidence = float(conf_raw)
                if confidence < confidence_threshold:
                    continue

                label = names.get(int(cls_raw), str(int(cls_raw)))
                student_id, display_name = resolve_student(label, roster)
                if not student_id:
                    continue

                if student_id in attendance:
                    attendance[student_id].seen_count += 1
                    attendance[student_id].confidence = max(
                        attendance[student_id].confidence,
                        confidence,
                    )
                else:
                    attendance[student_id] = AttendanceRecord(
                        student_id=student_id,
                        display_name=display_name or student_id,
                        first_seen_at=frame_ts,
                        confidence=confidence,
                    )

                events.append(
                    {
                        "studentId": student_id,
                        "behaviorType": "attendance",
                        "confidence": round(confidence, 4),
                        "frameTs": frame_ts,
                        "bbox": {
                            "x1": bbox[0],
                            "y1": bbox[1],
                            "x2": bbox[2],
                            "y2": bbox[3],
                        },
                        "attributes": {
                            "displayName": display_name,
                            "label": label,
                        },
                    }
                )

        student_metrics = [
            {
                "studentId": item.student_id,
                "displayName": item.display_name,
                "attendanceRate": 100,
                "lookUpRate": 0,
                "focusLevel": 0,
                "participationCount": 0,
                "rawSummary": {
                    "firstSeenAt": item.first_seen_at,
                    "seenCount": item.seen_count,
                    "confidence": round(item.confidence, 4),
                },
            }
            for item in attendance.values()
        ]

        class_metric = {
            "avgAttendance": 100 if student_metrics else 0,
            "avgLookUpRate": 0,
            "avgFocusLevel": 0,
            "avgParticipationCount": 0,
            "totalStudents": len(student_metrics),
            "distribution": {
                "presentStudentIds": [item["studentId"] for item in student_metrics],
                "presentCount": len(student_metrics),
            },
        }

        api_client.upload_batch(
            session_id=session_id,
            events=events,
            student_metrics=student_metrics,
            class_metric=class_metric,
            metadata={
                "attendanceMode": True,
                "presentCount": len(student_metrics),
                "presentStudentIds": [item["studentId"] for item in student_metrics],
            },
        )

        print(f"Attendance uploaded. Present count: {len(student_metrics)}")
        print(
            "Present student IDs:",
            ", ".join(item["studentId"] for item in student_metrics) or "None",
        )
    finally:
        cap.release()
        api_client.close_session(
            session_id=session_id,
            metadata={
                "attendanceMode": True,
                "presentCount": len(attendance),
                "presentStudentIds": list(attendance.keys()),
            },
        )
        print(f"Closed attendance session: {session_id}")


if __name__ == "__main__":
    main()
