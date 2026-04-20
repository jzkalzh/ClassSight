from __future__ import annotations

import os
import time

from dotenv import load_dotenv

from behavior import BehaviorBatchBuffer, BehaviorDetectionPipeline
from client import from_env
from common import open_video_capture, utc_now_iso


def main() -> None:
    load_dotenv()

    api_client = from_env()
    source_stream = os.getenv("SOURCE_STREAM", "0")
    model_path = os.getenv("YOLO_MODEL", "yolov8n.pt")
    batch_interval = int(os.getenv("BATCH_INTERVAL_SECONDS", "5"))
    run_seconds = int(os.getenv("BEHAVIOR_RUN_SECONDS", "0"))

    pipeline = BehaviorDetectionPipeline(model_path=model_path)

    session = api_client.start_session(
      course_id=os.getenv("COURSE_ID"),
      classroom=os.getenv("CLASSROOM"),
      source_stream=source_stream,
      metadata={
          "mode": "behavior_detection",
          "model": model_path,
          "source": "edge-behavior",
      },
    )
    session_id = session["id"]
    print(f"Started session: {session_id}")

    cap = open_video_capture(source_stream)
    buffer = BehaviorBatchBuffer()
    last_upload_ts = time.time()
    started_at = time.time()

    try:
        while True:
            if run_seconds > 0 and time.time() - started_at >= run_seconds:
                print("Behavior runtime window reached, stopping...")
                break

            ok, frame = cap.read()
            if not ok:
                print("Frame read failed, retrying...")
                time.sleep(0.2)
                continue

            frame_ts = utc_now_iso()
            pipeline.process_frame(frame, frame_ts, buffer)

            now = time.time()
            if now - last_upload_ts >= batch_interval:
                events, student_metrics, class_metric = buffer.build_payload()
                api_client.upload_batch(
                    session_id=session_id,
                    events=events,
                    student_metrics=student_metrics,
                    class_metric=class_metric,
                    metadata={
                        "pipeline": "behavior_detection",
                        "batchIntervalSeconds": batch_interval,
                    },
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
                metadata={
                    "pipeline": "behavior_detection",
                    "finalUpload": True,
                },
            )
        api_client.close_session(
            session_id=session_id,
            metadata={
                "pipeline": "behavior_detection",
            },
        )
        print(f"Closed session: {session_id}")


if __name__ == "__main__":
    main()
