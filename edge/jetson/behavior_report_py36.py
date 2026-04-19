from __future__ import print_function

import json
import os
from datetime import datetime

from dotenv import load_dotenv

from client_py36 import from_env


def utc_now_iso():
    return datetime.utcnow().isoformat() + "Z"


def get_optional_env(name):
    value = os.environ.get(name)
    if not value:
        return None
    if value.startswith("replace-with-"):
        return None
    return value


def load_behavior_result(path):
    with open(path, "r") as file_obj:
        return json.load(file_obj)


def build_default_class_metric(student_metrics):
    if not student_metrics:
        return {
            "avgAttendance": 0,
            "avgLookUpRate": 0,
            "avgFocusLevel": 0,
            "avgParticipationCount": 0,
            "totalStudents": 0,
            "distribution": {},
        }

    total = len(student_metrics)

    def avg(key):
        return round(sum(float(item.get(key, 0)) for item in student_metrics) / float(total), 2)

    return {
        "avgAttendance": avg("attendanceRate"),
        "avgLookUpRate": avg("lookUpRate"),
        "avgFocusLevel": avg("focusLevel"),
        "avgParticipationCount": avg("participationCount"),
        "totalStudents": total,
        "distribution": {},
    }


def normalize_events(payload):
    now = utc_now_iso()
    normalized = []

    for event in payload.get("events", []):
        behavior_type = event.get("behaviorType")
        if not behavior_type:
            continue

        normalized.append(
            {
                "studentId": event.get("studentId"),
                "trackerId": event.get("trackerId"),
                "behaviorType": behavior_type,
                "confidence": float(event.get("confidence", 1.0)),
                "frameTs": event.get("frameTs") or now,
                "durationMs": event.get("durationMs"),
                "bbox": event.get("bbox"),
                "attributes": event.get("attributes") or {},
            }
        )

    return normalized


def normalize_student_metrics(payload):
    normalized = []

    for metric in payload.get("studentMetrics", []):
        student_id = metric.get("studentId")
        tracker_id = metric.get("trackerId")
        if not student_id and not tracker_id:
            continue

        normalized.append(
            {
                "studentId": student_id,
                "trackerId": tracker_id,
                "displayName": metric.get("displayName") or student_id or tracker_id,
                "attendanceRate": float(metric.get("attendanceRate", 0)),
                "lookUpRate": float(metric.get("lookUpRate", 0)),
                "focusLevel": float(metric.get("focusLevel", 0)),
                "participationCount": int(metric.get("participationCount", 0)),
                "rawSummary": metric.get("rawSummary") or {},
            }
        )

    return normalized


def main():
    load_dotenv()

    behavior_json = os.environ.get("BEHAVIOR_JSON", "behavior_result.json")
    payload = load_behavior_result(behavior_json)
    client = from_env()

    session = client.start_session(
        course_id=get_optional_env("COURSE_ID"),
        classroom=get_optional_env("CLASSROOM"),
        source_stream=os.environ.get("SOURCE_NAME", "jetson-nano"),
        metadata={
            "mode": "behavior",
            "source": "jetson-nano",
        },
    )
    session_id = session["id"]

    events = normalize_events(payload)
    student_metrics = normalize_student_metrics(payload)
    class_metric = payload.get("classMetric") or build_default_class_metric(student_metrics)
    metadata = payload.get("metadata") or {}
    metadata.update(
        {
            "behaviorMode": True,
            "eventCount": len(events),
            "studentMetricCount": len(student_metrics),
        }
    )

    client.upload_batch(
        session_id=session_id,
        events=events,
        student_metrics=student_metrics,
        class_metric=class_metric,
        metadata=metadata,
    )
    client.close_session(session_id=session_id, metadata=metadata)

    print("behavior uploaded")
    print("event count:", len(events))
    print("student metric count:", len(student_metrics))


if __name__ == "__main__":
    main()
