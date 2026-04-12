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

## Attendance Only

If your edge device only needs to record attendance results and report the recognized student IDs:

```powershell
.venv\Scripts\Activate.ps1
Copy-Item attendance_roster.example.json attendance_roster.json
python run_attendance_report.py
```

`attendance_roster.json` is used to map your model labels to real student IDs.

## Notes

- This script assumes your YOLO model labels include `person`, `hand_raise`, `look_up`, `focus`.
- If your model only outputs raw classes, adapt `BEHAVIOR_LABELS` in `run_edge_inference.py`.
- If you already have your own YOLOv8 inference loop, you can keep it and only reuse `client.py`.
