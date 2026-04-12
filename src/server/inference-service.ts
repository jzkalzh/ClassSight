import prisma from "@/db/db";

type JsonObject = Record<string, unknown>;

export interface StartInferenceSessionInput {
  courseId?: string;
  classroom?: string;
  sourceStream?: string;
  startedAt?: string;
  metadata?: JsonObject;
}

export interface BehaviorEventInput {
  studentId?: string;
  trackerId?: string;
  behaviorType: string;
  confidence?: number;
  frameTs: string;
  durationMs?: number;
  bbox?: JsonObject;
  attributes?: JsonObject;
}

export interface StudentMetricInput {
  studentId?: string;
  trackerId?: string;
  displayName?: string;
  attendanceRate?: number;
  lookUpRate?: number;
  focusLevel?: number;
  participationCount?: number;
  score?: number;
  rawSummary?: JsonObject;
}

export interface ClassMetricInput {
  avgAttendance?: number;
  avgLookUpRate?: number;
  avgFocusLevel?: number;
  avgParticipationCount?: number;
  totalStudents?: number;
  distribution?: JsonObject;
}

export interface IngestInferencePayload {
  sessionId: string;
  events?: BehaviorEventInput[];
  studentMetrics?: StudentMetricInput[];
  classMetric?: ClassMetricInput;
  metadata?: JsonObject;
}

export interface CloseInferenceSessionInput {
  endedAt?: string;
  status?: "completed" | "failed";
  metadata?: JsonObject;
}

function clampRate(value?: number) {
  if (value == null || Number.isNaN(value)) return 0;
  return Math.max(0, Math.min(100, value));
}

function normalizeParticipation(value?: number) {
  if (value == null || Number.isNaN(value)) return 0;
  return Math.max(0, Math.round(value));
}

function normalizeAverage(value?: number) {
  if (value == null || Number.isNaN(value)) return 0;
  return Math.max(0, Number(value.toFixed(2)));
}

export function calculateScore(metric: StudentMetricInput) {
  if (typeof metric.score === "number") {
    return Math.max(0, Math.min(100, metric.score));
  }

  const attendanceRate = clampRate(metric.attendanceRate);
  const lookUpRate = clampRate(metric.lookUpRate);
  const focusLevel = clampRate(metric.focusLevel);

  return Number(
    (attendanceRate * 0.3 + lookUpRate * 0.4 + focusLevel * 0.3).toFixed(2),
  );
}

function buildMetricKey(metric: StudentMetricInput) {
  if (metric.studentId) return `student:${metric.studentId}`;
  if (metric.trackerId) return `tracker:${metric.trackerId}`;
  throw new Error("Each student metric must contain studentId or trackerId");
}

async function resolveKnownStudentIds(studentIds: string[]) {
  if (!studentIds.length) {
    return new Set<string>();
  }

  const students = await prisma.student.findMany({
    where: {
      studentId: {
        in: studentIds,
      },
    },
    select: {
      studentId: true,
    },
  });

  return new Set(students.map((student) => student.studentId));
}

export async function startInferenceSession(
  deviceId: string,
  input: StartInferenceSessionInput,
) {
  const session = await prisma.inferenceSession.create({
    data: {
      deviceId,
      courseId: input.courseId,
      classroom: input.classroom,
      sourceStream: input.sourceStream,
      startedAt: input.startedAt ? new Date(input.startedAt) : new Date(),
      metadata: input.metadata,
    },
    include: {
      device: true,
      course: true,
    },
  });

  await prisma.edgeDevice.update({
    where: { id: deviceId },
    data: { lastSeenAt: new Date() },
  });

  return session;
}

export async function ingestInferencePayload(
  deviceId: string,
  payload: IngestInferencePayload,
) {
  const session = await prisma.inferenceSession.findUnique({
    where: { id: payload.sessionId },
  });

  if (!session) {
    throw new Error("Inference session not found");
  }

  if (session.deviceId !== deviceId) {
    throw new Error("Session does not belong to current device");
  }

  const studentIds = Array.from(
    new Set(
      [
        ...(payload.events ?? []).map((item) => item.studentId).filter(Boolean),
        ...(payload.studentMetrics ?? []).map((item) => item.studentId).filter(Boolean),
      ] as string[],
    ),
  );
  const knownStudentIds = await resolveKnownStudentIds(studentIds);

  await prisma.$transaction(async (tx) => {
    await tx.inferenceSession.update({
      where: { id: payload.sessionId },
      data: {
        metadata: payload.metadata,
        updatedAt: new Date(),
      },
    });

    if (payload.events?.length) {
      await tx.behaviorEvent.createMany({
        data: payload.events.map((event) => ({
          sessionId: payload.sessionId,
          studentId: event.studentId && knownStudentIds.has(event.studentId) ? event.studentId : undefined,
          trackerId: event.trackerId || event.studentId,
          behaviorType: event.behaviorType,
          confidence: event.confidence,
          frameTs: new Date(event.frameTs),
          durationMs: event.durationMs,
          bbox: event.bbox,
          attributes: event.attributes,
        })),
      });
    }

    if (payload.studentMetrics?.length) {
      for (const metric of payload.studentMetrics) {
        const safeStudentId =
          metric.studentId && knownStudentIds.has(metric.studentId)
            ? metric.studentId
            : undefined;
        const safeTrackerId = metric.trackerId || metric.studentId;
        const metricKey = buildMetricKey({
          ...metric,
          studentId: safeStudentId,
          trackerId: safeTrackerId,
        });

        await tx.studentSessionMetric.upsert({
          where: {
            sessionId_metricKey: {
              sessionId: payload.sessionId,
              metricKey,
            },
          },
          create: {
            sessionId: payload.sessionId,
            metricKey,
            studentId: safeStudentId,
            trackerId: safeTrackerId,
            displayName: metric.displayName,
            attendanceRate: clampRate(metric.attendanceRate),
            lookUpRate: clampRate(metric.lookUpRate),
            focusLevel: clampRate(metric.focusLevel),
            participationCount: normalizeParticipation(metric.participationCount),
            score: calculateScore(metric),
            rawSummary: metric.rawSummary,
          },
          update: {
            studentId: safeStudentId,
            trackerId: safeTrackerId,
            displayName: metric.displayName,
            attendanceRate: clampRate(metric.attendanceRate),
            lookUpRate: clampRate(metric.lookUpRate),
            focusLevel: clampRate(metric.focusLevel),
            participationCount: normalizeParticipation(metric.participationCount),
            score: calculateScore(metric),
            rawSummary: metric.rawSummary,
          },
        });
      }
    }

    if (payload.classMetric) {
      await tx.classSessionMetric.upsert({
        where: { sessionId: payload.sessionId },
        create: {
          sessionId: payload.sessionId,
          avgAttendance: clampRate(payload.classMetric.avgAttendance),
          avgLookUpRate: clampRate(payload.classMetric.avgLookUpRate),
          avgFocusLevel: clampRate(payload.classMetric.avgFocusLevel),
          avgParticipationCount: normalizeAverage(
            payload.classMetric.avgParticipationCount,
          ),
          totalStudents: payload.classMetric.totalStudents ?? 0,
          distribution: payload.classMetric.distribution,
        },
        update: {
          avgAttendance: clampRate(payload.classMetric.avgAttendance),
          avgLookUpRate: clampRate(payload.classMetric.avgLookUpRate),
          avgFocusLevel: clampRate(payload.classMetric.avgFocusLevel),
          avgParticipationCount: normalizeAverage(
            payload.classMetric.avgParticipationCount,
          ),
          totalStudents: payload.classMetric.totalStudents ?? 0,
          distribution: payload.classMetric.distribution,
        },
      });
    }

    await tx.edgeDevice.update({
      where: { id: deviceId },
      data: { lastSeenAt: new Date() },
    });
  });

  return prisma.inferenceSession.findUnique({
    where: { id: payload.sessionId },
    include: {
      classMetric: true,
      studentMetrics: true,
    },
  });
}

export async function closeInferenceSession(
  deviceId: string,
  sessionId: string,
  input: CloseInferenceSessionInput,
) {
  const session = await prisma.inferenceSession.findUnique({
    where: { id: sessionId },
  });

  if (!session) {
    throw new Error("Inference session not found");
  }

  if (session.deviceId !== deviceId) {
    throw new Error("Session does not belong to current device");
  }

  return prisma.inferenceSession.update({
    where: { id: sessionId },
    data: {
      status: input.status ?? "completed",
      endedAt: input.endedAt ? new Date(input.endedAt) : new Date(),
      metadata: input.metadata,
    },
    include: {
      classMetric: true,
      studentMetrics: true,
    },
  });
}
