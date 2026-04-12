-- CreateTable
CREATE TABLE "edge_devices" (
    "id" VARCHAR(255) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "deviceKey" VARCHAR(255) NOT NULL,
    "location" VARCHAR(255),
    "status" VARCHAR(20) NOT NULL DEFAULT 'active',
    "lastSeenAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "edge_devices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inference_sessions" (
    "id" VARCHAR(255) NOT NULL,
    "deviceId" VARCHAR(255) NOT NULL,
    "courseId" VARCHAR(255),
    "classroom" VARCHAR(100),
    "sourceStream" VARCHAR(255),
    "status" VARCHAR(20) NOT NULL DEFAULT 'running',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inference_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "behavior_events" (
    "id" VARCHAR(255) NOT NULL,
    "sessionId" VARCHAR(255) NOT NULL,
    "studentId" VARCHAR(20),
    "trackerId" VARCHAR(100),
    "behaviorType" VARCHAR(50) NOT NULL,
    "confidence" DOUBLE PRECISION,
    "frameTs" TIMESTAMP(3) NOT NULL,
    "durationMs" INTEGER,
    "bbox" JSONB,
    "attributes" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "behavior_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_session_metrics" (
    "id" VARCHAR(255) NOT NULL,
    "sessionId" VARCHAR(255) NOT NULL,
    "metricKey" VARCHAR(150) NOT NULL,
    "studentId" VARCHAR(20),
    "trackerId" VARCHAR(100),
    "displayName" VARCHAR(100),
    "attendanceRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lookUpRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "focusLevel" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "participationCount" INTEGER NOT NULL DEFAULT 0,
    "score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "rawSummary" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "student_session_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "class_session_metrics" (
    "id" VARCHAR(255) NOT NULL,
    "sessionId" VARCHAR(255) NOT NULL,
    "avgAttendance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "avgLookUpRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "avgFocusLevel" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "avgParticipationCount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalStudents" INTEGER NOT NULL DEFAULT 0,
    "distribution" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "class_session_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "edge_devices_deviceKey_key" ON "edge_devices"("deviceKey");

-- CreateIndex
CREATE INDEX "inference_sessions_deviceId_status_idx" ON "inference_sessions"("deviceId", "status");

-- CreateIndex
CREATE INDEX "inference_sessions_courseId_startedAt_idx" ON "inference_sessions"("courseId", "startedAt");

-- CreateIndex
CREATE INDEX "behavior_events_sessionId_frameTs_idx" ON "behavior_events"("sessionId", "frameTs");

-- CreateIndex
CREATE INDEX "behavior_events_studentId_frameTs_idx" ON "behavior_events"("studentId", "frameTs");

-- CreateIndex
CREATE INDEX "behavior_events_behaviorType_frameTs_idx" ON "behavior_events"("behaviorType", "frameTs");

-- CreateIndex
CREATE INDEX "student_session_metrics_sessionId_idx" ON "student_session_metrics"("sessionId");

-- CreateIndex
CREATE INDEX "student_session_metrics_studentId_idx" ON "student_session_metrics"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "student_session_metrics_sessionId_metricKey_key" ON "student_session_metrics"("sessionId", "metricKey");

-- CreateIndex
CREATE UNIQUE INDEX "class_session_metrics_sessionId_key" ON "class_session_metrics"("sessionId");

-- AddForeignKey
ALTER TABLE "inference_sessions" ADD CONSTRAINT "inference_sessions_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "edge_devices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inference_sessions" ADD CONSTRAINT "inference_sessions_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "behavior_events" ADD CONSTRAINT "behavior_events_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "inference_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "behavior_events" ADD CONSTRAINT "behavior_events_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("studentId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_session_metrics" ADD CONSTRAINT "student_session_metrics_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "inference_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_session_metrics" ADD CONSTRAINT "student_session_metrics_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("studentId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_session_metrics" ADD CONSTRAINT "class_session_metrics_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "inference_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
