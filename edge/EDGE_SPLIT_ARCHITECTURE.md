# Edge Split Architecture

## Functional Split

The edge runtime is divided into two independent subsystems:

1. `Two-stage face attendance recognition`
2. `Classroom behavior detection`

These two pipelines can be deployed independently and report to the same backend.

## Pipeline A: Two-Stage Face Attendance

Purpose:

- identify which students are present
- output attendance student IDs
- support small-face recognition in classroom scenes

Flow:

```text
camera frame
  -> face detector
  -> face crop
  -> small-face enhancement
  -> face recognizer
  -> label to studentId mapping
  -> attendance events + attendance metrics
  -> backend upload
```

Main script:

- `run_two_stage_attendance.py`

## Pipeline B: Classroom Behavior Detection

Purpose:

- detect classroom actions such as hand raise, look up, and focus
- produce per-tracker and per-session behavior metrics

Flow:

```text
camera frame
  -> YOLO behavior detector / tracker
  -> action labels
  -> tracker-level accumulation
  -> class metrics
  -> backend upload
```

Main script:

- `run_edge_inference.py`

## Unified Launcher

To make deployment simpler, the runtime provides:

- `run_edge_service.py`

Mode selection:

- `EDGE_PIPELINE_MODE=attendance`
- `EDGE_PIPELINE_MODE=behavior`

## Backend Mapping

Both pipelines upload to the same backend APIs:

- `POST /api/edge/session`
- `POST /api/edge/events`
- `POST /api/edge/session/:id/close`

But their semantics are different:

- attendance pipeline reports `behaviorType=attendance`
- behavior pipeline reports `hand_raise`, `look_up`, `focus`, and attendance-like presence derived from tracking

## Recommended Deployment Strategy

For the first version on Jetson Nano:

1. Run attendance recognition as a dedicated service before or at class start.
2. Run behavior detection as a continuous in-class service.
3. Keep the models and logs separated so each pipeline can be tuned independently.
