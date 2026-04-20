# Two-Stage Face Attendance Architecture

## Recommended Model Stack

For Jetson Nano, the recommended default stack is:

1. Stage 1 detector: `RetinaFace-MobileNet0.25`
2. Small-face enhancement: `crop + resize + CLAHE + sharpen + face alignment`
3. Stage 2 recognizer: `MobileFaceNet` trained with `ArcFace`
4. Matching: cosine similarity against a local face gallery

This stack is chosen because it is more realistic for classroom attendance than using a generic detector twice.

## Why This Combination

### Detector

`RetinaFace-MobileNet0.25` is a good default because:

- it is anchor-based
- it performs well on small faces
- it is lightweight enough for Jetson Nano after ONNX/TensorRT optimization
- it also provides landmarks that help stage 2 alignment

### Recognizer

`MobileFaceNet + ArcFace` is a strong lightweight recognition baseline because:

- it has much lower compute cost than large ResNet recognizers
- it can be quantized or pruned later
- it is widely used and easy to export to ONNX

## Anchor Strategy

For classroom scenes, faces in the back row are usually tiny, so the detector should emphasize small-scale anchors.

Recommended anchor grouping:

- `stride 8`: `8, 16, 24, 32`
- `stride 16`: `48, 64, 96`
- `stride 32`: `128, 192, 256`

This means:

- shallow feature maps focus on far-away students
- medium feature maps capture mid-row faces
- large feature maps capture near-camera faces

## Runtime Pipeline

```text
camera frame
  -> anchor-based face detector
  -> face bbox + landmarks
  -> crop face ROI
  -> small-face enhancement
  -> face alignment
  -> face embedding model
  -> cosine similarity against student gallery
  -> recognized studentId
  -> attendance event and metric upload
```

## Recommended Edge Directory

```text
classsight-edge-jetson/
  .env
  attendance_result.json
  face_roster.json
  face_gallery/
    20230001.jpg
    20230002.jpg
  models/
    retinaface-mnet.onnx
    mobilefacenet-arcface.onnx
  run_two_stage_attendance.py
  two_stage/
```

## Backend Integration

The edge runtime uploads to the existing ClassSight backend:

- `POST /api/edge/session`
- `POST /api/edge/events`
- `POST /api/edge/session/:id/close`

The backend then persists:

- `InferenceSession`
- `BehaviorEvent`
- `StudentSessionMetric`
- `ClassSessionMetric`

## Practical Deployment Advice

- Use ONNX first for functional validation.
- Convert to TensorRT after the pipeline is stable.
- Keep detector input at `640x640` first.
- Keep recognizer crop size at `112x112`.
- Save one frontal face template per student at the beginning, then expand to a multi-image gallery later.
