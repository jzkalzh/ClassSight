# Jetson Nano Attendance Uploader

This folder contains a Python 3.6 compatible uploader for Jetson Nano.

It does not require `torch` or `ultralytics`.
It expects your recognition program to produce an `attendance_result.json` file like:

```json
{
  "students": [
    {
      "studentId": "20230001",
      "displayName": "张三",
      "confidence": 0.98
    }
  ]
}
```

## Setup on Jetson

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
cp attendance_result.example.json attendance_result.json
python3 attendance_report_py36.py
```

## Behavior Upload Bridge

If your custom CUDA action model writes a JSON result file, you can keep the model runtime unchanged and only use the Python 3.6 uploader bridge:

```bash
source .venv/bin/activate
cp behavior_result.example.json behavior_result.json
python3 behavior_report_py36.py
```

Expected JSON keys:

- `events`
- `studentMetrics`
- `classMetric`
- `metadata`

Only `behaviorType` is required inside each event.  
Inside `studentMetrics`, either `studentId` or `trackerId` is enough.

## Notes

- `API_BASE_URL` should point to the computer running your Next.js service.
- `DEVICE_KEY` must match a device row in the backend database.
- You can modify your recognition program to overwrite `attendance_result.json` before running the uploader.
- This folder is designed to avoid changing the Jetson CUDA runtime or upgrading the system Python.
