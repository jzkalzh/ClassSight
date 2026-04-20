# Edge Runtime

## Setup

```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
```

Fill `.env` with:

- `API_BASE_URL`
- `DEVICE_KEY`
- `COURSE_ID`
- `CLASSROOM`
- `SOURCE_STREAM`
- `YOLO_MODEL`

## Run

```powershell
.venv\Scripts\Activate.ps1
python run_edge_inference.py
```

Or use the unified launcher:

```powershell
.venv\Scripts\Activate.ps1
python run_edge_service.py
```

Set `EDGE_PIPELINE_MODE=behavior`, `EDGE_PIPELINE_MODE=attendance`, or `EDGE_PIPELINE_MODE=all` in `.env`.

## Attendance Only

If your edge device only needs to record attendance results and report the recognized student IDs:

```powershell
.venv\Scripts\Activate.ps1
Copy-Item attendance_roster.example.json attendance_roster.json
python run_attendance_report.py
```

`attendance_roster.json` is used to map your model labels to real student IDs.

## Two-Stage Face Attendance

This runtime now supports a two-stage attendance pipeline:

1. Stage 1 uses an anchor-based face detector to find face boxes.
2. Stage 2 crops each face, enhances small faces, and runs a face recognition model.
3. Recognized labels are mapped to real student IDs through `face_roster.json`.
4. The script uploads attendance events and writes `attendance_result.json` for downstream compatibility.

Recommended default stack for Jetson Nano:

- Detector: `RetinaFace-MobileNet0.25`
- Recognizer: `MobileFaceNet + ArcFace`
- Deployment target: `ONNX`, then `TensorRT`

Suggested local layout:

```text
edge/
  models/
    face-detect.pt
    face-recognizer.pt
  face_gallery.json
  face_roster.json
  .env
```

Setup:

```powershell
.venv\Scripts\Activate.ps1
Copy-Item face_roster.example.json face_roster.json
python run_two_stage_attendance.py
```

Required environment variables for this mode:

- `FACE_DETECT_MODEL`
- `FACE_DETECT_BACKEND`
- `FACE_RECOGNIZER_MODEL`
- `FACE_RECOGNIZER_BACKEND`
- `FACE_ROSTER_PATH`
- `FACE_GALLERY_PATH`
- `FACE_DETECT_CONFIDENCE`
- `FACE_RECOGNITION_CONFIDENCE`
- `FACE_MATCH_THRESHOLD`
- `FACE_RECOGNIZER_INPUT_SIZE`
- `FACE_MIN_SIZE`
- `FACE_UPSCALE_FACTOR`

Current detector backends:

- `yolo`: use a YOLO-style face detector
- `scrfd_onnx`: use an ONNX SCRFD detector

Current recognizer backends:

- `yolo_cls`: use a classification-style recognizer and map labels with `face_roster.json`
- `onnx_embedding`: use an ONNX embedding model and match against `face_gallery.json`

See also:

- `TWO_STAGE_ARCHITECTURE.md`
- `TWO_STAGE_DEPLOY.md`
- `two_stage/model_profile.example.json`
- `EDGE_SPLIT_ARCHITECTURE.md`

## Notes

- This script assumes your YOLO model labels include `person`, `hand_raise`, `look_up`, `focus`.
- If your model only outputs raw classes, adapt `BEHAVIOR_LABELS` in `run_edge_inference.py`.
- If you already have your own YOLOv8 inference loop, you can keep it and only reuse `client.py`.
- `run_two_stage_attendance.py` expects a face detector plus a configurable face recognizer backend.
- The recognizer backend is pluggable, so you can later swap in an optimized ONNX or TensorRT model with minimal code changes.
- If Jetson still uses Python 3.6, you can run the recognition program separately and let `jetson/attendance_report_py36.py` upload the generated `attendance_result.json`.
- Attendance recognition and behavior detection are intentionally split into two independent pipelines.
- `BEHAVIOR_RUN_SECONDS=0` means the behavior detector runs continuously until interrupted.
