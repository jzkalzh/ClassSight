from __future__ import annotations

import json
import os
import time
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv

from client import from_env
from common import open_video_capture, utc_now_iso
from two_stage import TwoStageFaceAttendancePipeline


@dataclass
class AttendanceRecord:
    student_id: str
    display_name: str
    first_seen_at: str
    last_seen_at: str
    best_confidence: float
    detector_confidence: float
    seen_count: int = 1
    small_face_hits: int = 0


def write_result_json(output_path: str, attendance: dict[str, AttendanceRecord]) -> None:
    payload = {
        "students": [
            {
                "studentId": item.student_id,
                "displayName": item.display_name,
                "confidence": round(item.best_confidence, 4),
                "source": "two_stage_face_pipeline",
            }
            for item in attendance.values()
        ]
    }

    path = Path(output_path)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def main() -> None:
    load_dotenv()

    api_client = from_env()
    source_stream = os.getenv("SOURCE_STREAM", "0")
    capture_source: int | str = int(source_stream) if source_stream.isdigit() else source_stream
    observe_seconds = int(os.getenv("ATTENDANCE_OBSERVE_SECONDS", "15"))
    result_output_path = os.getenv("ATTENDANCE_RESULT_PATH", "attendance_result.json")

    pipeline = TwoStageFaceAttendancePipeline(
        detect_model_path=os.getenv("FACE_DETECT_MODEL", "models/face-detect.pt"),
        recognize_model_path=os.getenv("FACE_RECOGNIZER_MODEL", "models/face-recognizer.pt"),
        roster_path=os.getenv("FACE_ROSTER_PATH", "face_roster.json"),
        detect_confidence=float(os.getenv("FACE_DETECT_CONFIDENCE", "0.35")),
        detect_iou=float(os.getenv("FACE_DETECT_IOU", "0.5")),
        recognition_confidence=float(os.getenv("FACE_RECOGNITION_CONFIDENCE", "0.65")),
        min_face_size=int(os.getenv("FACE_MIN_SIZE", "72")),
        upscale_factor=float(os.getenv("FACE_UPSCALE_FACTOR", "2.0")),
        padding_ratio=float(os.getenv("FACE_PADDING_RATIO", "0.18")),
        detect_image_size=int(os.getenv("FACE_DETECT_IMAGE_SIZE", "640")),
        face_class_name=os.getenv("FACE_CLASS_NAME", "face"),
        detect_backend=os.getenv("FACE_DETECT_BACKEND", "yolo"),
        recognize_backend=os.getenv("FACE_RECOGNIZER_BACKEND", "yolo_cls"),
        gallery_path=os.getenv("FACE_GALLERY_PATH"),
        embedding_match_threshold=float(os.getenv("FACE_MATCH_THRESHOLD", "0.45")),
        recognizer_input_size=int(os.getenv("FACE_RECOGNIZER_INPUT_SIZE", "112")),
    )

    session = api_client.start_session(
        course_id=os.getenv("COURSE_ID"),
        classroom=os.getenv("CLASSROOM"),
        source_stream=source_stream,
        metadata={
            "mode": "two_stage_attendance",
            "detectModel": os.getenv("FACE_DETECT_MODEL", "models/face-detect.pt"),
            "detectBackend": os.getenv("FACE_DETECT_BACKEND", "yolo"),
            "recognizeModel": os.getenv("FACE_RECOGNIZER_MODEL", "models/face-recognizer.pt"),
            "recognizeBackend": os.getenv("FACE_RECOGNIZER_BACKEND", "yolo_cls"),
            "source": "edge-two-stage",
        },
    )
    session_id = session["id"]
    print(f"Started two-stage attendance session: {session_id}")

    cap = open_video_capture(source_stream)
    attendance: dict[str, AttendanceRecord] = {}
    events: list[dict[str, object]] = []
    total_face_detections = 0
    small_face_count = 0
    started_at = time.time()

    try:
        while time.time() - started_at < observe_seconds:
            ok, frame = cap.read()
            if not ok:
                time.sleep(0.1)
                continue

            frame_ts = utc_now_iso()
            result = pipeline.process_frame(frame)
            total_face_detections += len(result.detections)
            small_face_count += result.small_face_count

            for recognition in result.recognitions:
                existing = attendance.get(recognition.student_id)
                if existing:
                    existing.seen_count += 1
                    existing.last_seen_at = frame_ts
                    existing.best_confidence = max(existing.best_confidence, recognition.confidence)
                    existing.detector_confidence = max(
                        existing.detector_confidence,
                        recognition.detector_confidence,
                    )
                    if recognition.upscale_applied:
                        existing.small_face_hits += 1
                else:
                    attendance[recognition.student_id] = AttendanceRecord(
                        student_id=recognition.student_id,
                        display_name=recognition.display_name,
                        first_seen_at=frame_ts,
                        last_seen_at=frame_ts,
                        best_confidence=recognition.confidence,
                        detector_confidence=recognition.detector_confidence,
                        small_face_hits=1 if recognition.upscale_applied else 0,
                    )

                x1, y1, x2, y2 = recognition.bbox
                events.append(
                    {
                        "studentId": recognition.student_id,
                        "behaviorType": "attendance",
                        "confidence": recognition.confidence,
                        "frameTs": frame_ts,
                        "bbox": {
                            "x1": x1,
                            "y1": y1,
                            "x2": x2,
                            "y2": y2,
                        },
                        "attributes": {
                            "displayName": recognition.display_name,
                            "label": recognition.label,
                            "detectorConfidence": recognition.detector_confidence,
                            "recognitionConfidence": recognition.confidence,
                            "recognizerBackend": recognition.recognizer_backend,
                            "recognizerExtra": recognition.recognizer_extra,
                            "originalFaceSize": {
                                "width": recognition.original_size[0],
                                "height": recognition.original_size[1],
                            },
                            "processedFaceSize": {
                                "width": recognition.processed_size[0],
                                "height": recognition.processed_size[1],
                            },
                            "upscaleApplied": recognition.upscale_applied,
                            "upscaleFactor": recognition.upscale_factor,
                        },
                    }
                )

        write_result_json(result_output_path, attendance)

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
                    "lastSeenAt": item.last_seen_at,
                    "seenCount": item.seen_count,
                    "confidence": round(item.best_confidence, 4),
                    "detectorConfidence": round(item.detector_confidence, 4),
                    "smallFaceHits": item.small_face_hits,
                    "pipeline": "two_stage_face",
                    "recognizerBackend": os.getenv("FACE_RECOGNIZER_BACKEND", "yolo_cls"),
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
                "totalFaceDetections": total_face_detections,
                "smallFaceDetections": small_face_count,
            },
        }

        metadata = {
            "attendanceMode": True,
            "pipeline": "two_stage_face",
            "recognizeBackend": os.getenv("FACE_RECOGNIZER_BACKEND", "yolo_cls"),
            "presentCount": len(student_metrics),
            "presentStudentIds": [item["studentId"] for item in student_metrics],
            "totalFaceDetections": total_face_detections,
            "smallFaceDetections": small_face_count,
            "resultOutputPath": result_output_path,
        }

        api_client.upload_batch(
            session_id=session_id,
            events=events,
            student_metrics=student_metrics,
            class_metric=class_metric,
            metadata=metadata,
        )

        print(f"Two-stage attendance uploaded. Present count: {len(student_metrics)}")
        print("Present student IDs:", ", ".join(item["studentId"] for item in student_metrics) or "None")
        print(f"Attendance result saved to: {result_output_path}")
    finally:
        cap.release()
        api_client.close_session(
            session_id=session_id,
            metadata={
                "attendanceMode": True,
                "pipeline": "two_stage_face",
                "recognizeBackend": os.getenv("FACE_RECOGNIZER_BACKEND", "yolo_cls"),
                "presentCount": len(attendance),
                "presentStudentIds": list(attendance.keys()),
            },
        )
        print(f"Closed two-stage attendance session: {session_id}")


if __name__ == "__main__":
    main()
