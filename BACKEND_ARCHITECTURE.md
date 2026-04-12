# ClassSight Backend Architecture

## Goal

Build a backend path that lets an edge device run YOLOv8 locally, summarize classroom behavior, and push usable data into the existing Next.js + Prisma project.

This design keeps three concerns separate:

1. The edge device does high-frequency inference.
2. The web backend stores sessions, raw events, and aggregated metrics.
3. The frontend reads stable course-level and student-level performance data.

## Recommended deployment split

### Edge side

- Capture camera stream.
- Run YOLOv8 detection and tracking locally.
- Convert frame-level results into:
  - raw behavior events for audit/debug
  - student/session metrics for frontend display
- Push batches to the web service through authenticated HTTP.

Recommended local modules on the device:

- `capture_service`: RTSP/USB camera access
- `inference_service`: YOLOv8 detect + track
- `behavior_mapper`: map boxes/tracks to behaviors like `look_up`, `focus`, `hand_raise`
- `student_mapper`: optional seat map or roster mapping from `trackerId -> studentId`
- `uploader`: buffer, retry, and send batched payloads

### Web/backend side

- `edge session API`: start/close a classroom inference session
- `edge ingest API`: receive batched raw events and aggregated metrics
- `performance query API`: provide the latest course performance snapshot for the frontend
- `Prisma/PostgreSQL`: persist devices, sessions, events, and metrics

## Data model

The project now includes these new backend entities in `prisma/schema.prisma`:

- `EdgeDevice`: a registered edge node authenticated by `deviceKey`
- `InferenceSession`: one classroom run on one device
- `BehaviorEvent`: raw event stream such as `attendance`, `look_up`, `focus`, `hand_raise`
- `StudentSessionMetric`: per-student aggregated metrics for one session
- `ClassSessionMetric`: class-wide aggregated metrics for one session

This split is deliberate:

- raw events help with traceability and later algorithm tuning
- session metrics keep frontend queries cheap
- devices/sessions give you observability and operational control

## API contract

### 1. Start a session

`POST /api/edge/session`

Headers:

- `x-device-key: <device key>`

Body example:

```json
{
  "courseId": "course-uuid",
  "classroom": "A-206",
  "sourceStream": "rtsp://camera-01/live",
  "metadata": {
    "model": "yolov8n",
    "deviceName": "jetson-nano-01"
  }
}
```

### 2. Upload events and metrics

`POST /api/edge/events`

Headers:

- `x-device-key: <device key>`

Body example:

```json
{
  "sessionId": "session-uuid",
  "events": [
    {
      "studentId": "20230001",
      "trackerId": "track-7",
      "behaviorType": "hand_raise",
      "confidence": 0.94,
      "frameTs": "2026-03-28T09:00:08.000Z",
      "durationMs": 900
    }
  ],
  "studentMetrics": [
    {
      "studentId": "20230001",
      "trackerId": "track-7",
      "displayName": "Student 1",
      "attendanceRate": 100,
      "lookUpRate": 82,
      "focusLevel": 88,
      "participationCount": 3
    }
  ],
  "classMetric": {
    "avgAttendance": 96,
    "avgLookUpRate": 79,
    "avgFocusLevel": 84,
    "avgParticipationCount": 2,
    "totalStudents": 42
  }
}
```

### 3. Close a session

`POST /api/edge/session/:id/close`

Headers:

- `x-device-key: <device key>`

Body example:

```json
{
  "status": "completed",
  "endedAt": "2026-03-28T10:35:00.000Z"
}
```

### 4. Frontend query

`GET /api/performance/course/:id`

This returns the latest session snapshot for the course, including:

- course info
- latest session info
- class stats
- ranked student metrics

## Suggested edge reporting strategy

Do not upload every frame directly to the web server.

Recommended batching:

- raw `events`: every 3 to 10 seconds
- `studentMetrics`: every 10 to 30 seconds
- `classMetric`: every 10 to 30 seconds
- session close: once after class ends

This is a better fit for unstable edge networks and keeps the database manageable.

## Student identity mapping

YOLOv8 alone usually gives you detection/tracking, not identity.

You have three practical options:

1. `trackerId` only
   Use when you only need anonymous seat-level analytics.
2. `seat map -> studentId`
   Best fit for classrooms with fixed seating.
3. external face/ID recognition service
   Use only if you really need named students and can accept the privacy/complexity cost.

The current backend supports both `studentId` and `trackerId`, so you can start anonymous and add identity mapping later.

## Minimal device workflow

1. Device boots and loads local config.
2. Before class starts, device calls `POST /api/edge/session`.
3. During class, device runs YOLOv8 and updates local counters.
4. Every few seconds, device pushes a batch to `POST /api/edge/events`.
5. When class ends, device calls `POST /api/edge/session/:id/close`.
6. Frontend reads `GET /api/performance/course/:id`.

## Operational advice

- Keep the device key in an environment variable, not hard-coded.
- Add a local retry queue on the device so brief network failures do not lose data.
- Prefer sending aggregated metrics more often than raw events.
- Store model name, FPS, and camera ID in `metadata` for debugging.
- If event volume grows too much, add a scheduled cleanup job for old `BehaviorEvent` rows.

## Next recommended steps

1. Run `prisma generate`.
2. Create and apply a migration for the new tables.
3. Seed one `EdgeDevice` row with a generated `deviceKey`.
4. Make the frontend performance page fetch `/api/performance/course/:id` instead of mock data.
5. Implement the edge uploader in Python on the YOLOv8 device.
