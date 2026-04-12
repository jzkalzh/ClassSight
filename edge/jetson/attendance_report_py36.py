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


def load_attendance_result(path):
    with open(path, "r") as file_obj:
        return json.load(file_obj)


def normalize_students(payload):
    students = payload.get("students", [])
    student_metrics = []
    events = []
    now = utc_now_iso()

    for student in students:
        student_id = student.get("studentId")
        if not student_id:
            continue

        display_name = student.get("displayName") or student_id
        confidence = float(student.get("confidence", 1.0))
        student_metrics.append(
            {
                "studentId": student_id,
                "displayName": display_name,
                "attendanceRate": 100,
                "lookUpRate": 0,
                "focusLevel": 0,
                "participationCount": 0,
                "rawSummary": {
                    "confidence": confidence,
                    "source": student.get("source", "attendance_json"),
                },
            }
        )
        events.append(
            {
                "studentId": student_id,
                "behaviorType": "attendance",
                "confidence": confidence,
                "frameTs": now,
                "attributes": {
                    "displayName": display_name,
                },
            }
        )

    class_metric = {
        "avgAttendance": 100 if student_metrics else 0,
        "avgLookUpRate": 0,
        "avgFocusLevel": 0,
        "avgParticipationCount": 0,
        "totalStudents": len(student_metrics),
        "distribution": {
            "presentCount": len(student_metrics),
            "presentStudentIds": [item["studentId"] for item in student_metrics],
        },
    }

    return events, student_metrics, class_metric


def main():
    load_dotenv()

    attendance_json = os.environ.get("ATTENDANCE_JSON", "attendance_result.json")
    payload = load_attendance_result(attendance_json)
    client = from_env()

    session = client.start_session(
        course_id=get_optional_env("COURSE_ID"),
        classroom=get_optional_env("CLASSROOM"),
        source_stream=os.environ.get("SOURCE_NAME", "jetson-nano"),
        metadata={
            "mode": "attendance",
            "source": "jetson-nano",
        },
    )
    session_id = session["id"]

    events, student_metrics, class_metric = normalize_students(payload)
    metadata = {
        "attendanceMode": True,
        "presentCount": len(student_metrics),
        "presentStudentIds": [item["studentId"] for item in student_metrics],
    }

    client.upload_batch(
        session_id=session_id,
        events=events,
        student_metrics=student_metrics,
        class_metric=class_metric,
        metadata=metadata,
    )
    client.close_session(session_id=session_id, metadata=metadata)

    print("attendance uploaded")
    print("present count:", len(student_metrics))
    print("student ids:", ",".join(metadata["presentStudentIds"]))


if __name__ == "__main__":
    main()
