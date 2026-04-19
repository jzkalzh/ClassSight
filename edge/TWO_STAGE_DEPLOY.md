# Two-Stage Face Attendance Deployment

## Goal

Deploy a two-stage attendance pipeline to the edge device:

1. Stage 1 detects face anchors from the classroom frame.
2. Stage 2 crops each face, enhances small faces, and runs face recognition.
3. The recognized student IDs are uploaded to the ClassSight backend.

## Runtime Layout

```text
edge/
  .env
  client.py
  run_two_stage_attendance.py
  face_roster.json
  face_gallery.json
  models/
    face-detect.pt
    face-recognizer.pt
  two_stage/
    pipeline.py
```

## Environment Variables

```env
API_BASE_URL=http://<your-pc-ip>:3000
DEVICE_KEY=<device-key>
COURSE_ID=<course-id>
CLASSROOM=A-206
SOURCE_STREAM=0
ATTENDANCE_OBSERVE_SECONDS=15
ATTENDANCE_RESULT_PATH=attendance_result.json

FACE_DETECT_MODEL=models/face-detect.pt
FACE_RECOGNIZER_MODEL=models/face-recognizer.pt
FACE_RECOGNIZER_BACKEND=yolo_cls
FACE_ROSTER_PATH=face_roster.json
FACE_GALLERY_PATH=face_gallery.json
FACE_CLASS_NAME=face
FACE_DETECT_CONFIDENCE=0.35
FACE_DETECT_IOU=0.5
FACE_DETECT_IMAGE_SIZE=640
FACE_RECOGNITION_CONFIDENCE=0.65
FACE_MATCH_THRESHOLD=0.45
FACE_RECOGNIZER_INPUT_SIZE=112
FACE_MIN_SIZE=72
FACE_UPSCALE_FACTOR=2.0
FACE_PADDING_RATIO=0.18
```

## Recommended Deployment Modes

### Mode A: Jetson runs the full pipeline

Use this when Jetson already has a Python environment that can run `ultralytics` and OpenCV.

Command:

```bash
source .venv/bin/activate
python run_two_stage_attendance.py
```

### Mode B: Jetson only uploads recognition results

Use this when Jetson still stays on Python 3.6 or your recognition program is maintained separately.

1. Run your own detector + recognizer program and write `attendance_result.json`.
2. Use the legacy uploader:

```bash
source .venv/bin/activate
python attendance_report_py36.py
```

## Data Flow

```text
Camera Frame
  -> face-detect.pt
  -> face crop
  -> small-face enhancement
  -> recognizer backend
  -> yolo_cls or onnx_embedding
  -> label mapping or gallery matching
  -> attendance_result.json
  -> /api/edge/session
  -> /api/edge/events
  -> /api/edge/session/:id/close
```

## Notes

- `face_roster.json` maps recognition labels to real student IDs.
- `face_gallery.json` stores face embeddings when you use the `onnx_embedding` backend.
- The pipeline writes `attendance_result.json` so the result can be reused by the Python 3.6 uploader if needed.
- For small faces, the current implementation uses resize + CLAHE + sharpening before stage 2 recognition.
- If your detector model uses another class name, update `FACE_CLASS_NAME`.
