from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from ultralytics import YOLO


DEFAULT_BEHAVIOR_LABELS = {
    0: "person",
    1: "hand_raise",
    2: "look_up",
    3: "focus",
}


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
class BehaviorBatchBuffer:
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


class BehaviorDetectionPipeline:
    def __init__(
        self,
        model_path: str,
        behavior_labels: dict[int, str] | None = None,
    ) -> None:
        self.model_path = model_path
        self.model = YOLO(model_path)
        self.behavior_labels = behavior_labels or DEFAULT_BEHAVIOR_LABELS

    def process_frame(
        self,
        frame: Any,
        frame_ts: str,
        buffer: BehaviorBatchBuffer,
    ) -> None:
        results = self.model.track(frame, persist=True, verbose=False)
        if not results or results[0].boxes is None:
            return

        boxes = results[0].boxes
        ids = boxes.id.tolist() if boxes.id is not None else []
        classes = boxes.cls.tolist() if boxes.cls is not None else []
        confs = boxes.conf.tolist() if boxes.conf is not None else []
        coords = boxes.xyxy.tolist() if boxes.xyxy is not None else []

        if not ids:
            ids = list(range(len(coords)))

        for tracker_raw, cls_raw, conf_raw, bbox in zip(ids, classes, confs, coords):
            tracker_id = f"track-{int(tracker_raw)}"
            behavior = self.behavior_labels.get(int(cls_raw), "person")
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
                    "attributes": {
                        "pipeline": "behavior_detection",
                        "rawClass": int(cls_raw),
                        "modelPath": self.model_path,
                    },
                }
            )
