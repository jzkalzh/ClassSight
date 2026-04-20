import prisma from "@/db/db";

type RankedStudentMetric = {
  id: string;
  name: string;
  studentId?: string;
  trackerId?: string;
  attendanceRate: number;
  lookUpRate: number;
  focusLevel: number;
  participationCount: number;
  score: number;
  rank: number;
};

type PeerCourseMetric = {
  id: string;
  name: string;
  teacherName: string;
  avgAttendance: number;
  avgLookUpRate: number;
  avgFocusLevel: number;
  avgParticipationCount: number;
  score: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function sanitizeRate(value: unknown, fallback = 0) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return clamp(fallback, 0, 100);
  }

  return Number(clamp(numeric, 0, 100).toFixed(2));
}

function sanitizeParticipation(value: unknown, fallback = 0) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return Number(Math.max(fallback, 0).toFixed(2));
  }

  return Number(Math.max(numeric, 0).toFixed(2));
}

function sanitizeScore(value: unknown, fallback: number) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return Number(clamp(fallback, 0, 100).toFixed(2));
  }

  return Number(clamp(numeric, 0, 100).toFixed(2));
}

function normalizeStudentMetric(metric: {
  attendanceRate: unknown;
  lookUpRate: unknown;
  focusLevel: unknown;
  participationCount: unknown;
  score?: unknown;
}) {
  const attendanceRate = sanitizeRate(metric.attendanceRate);
  const lookUpRate = attendanceRate <= 0 ? 0 : sanitizeRate(metric.lookUpRate);
  const focusLevel = attendanceRate <= 0 ? 0 : sanitizeRate(metric.focusLevel);
  const participationCount = attendanceRate <= 0 ? 0 : sanitizeParticipation(metric.participationCount);
  const fallbackScore =
    attendanceRate <= 0
      ? 0
      : calculateCompositeScore({
          avgAttendance: attendanceRate,
          avgLookUpRate: lookUpRate,
          avgFocusLevel: focusLevel,
          avgParticipationCount: participationCount,
        });
  const score = attendanceRate <= 0 ? 0 : sanitizeScore(metric.score, fallbackScore);

  return {
    attendanceRate,
    lookUpRate,
    focusLevel,
    participationCount,
    score,
  };
}

function average(values: number[]) {
  if (!values.length) return 0;
  return Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(2));
}

function calculateCompositeScore(metrics: {
  avgAttendance: number;
  avgLookUpRate: number;
  avgFocusLevel: number;
  avgParticipationCount: number;
}) {
  return Number(
    (
      metrics.avgAttendance * 0.3 +
      metrics.avgLookUpRate * 0.2 +
      metrics.avgFocusLevel * 0.35 +
      Math.min(metrics.avgParticipationCount * 12, 100) * 0.15
    ).toFixed(2),
  );
}

function sanitizeDistribution(
  distribution: unknown,
  students: RankedStudentMetric[],
) {
  if (Array.isArray(distribution)) {
    const normalized = distribution
      .map((item) => {
        if (!item || typeof item !== "object") return null;

        const name = "name" in item ? String(item.name ?? "") : "";
        const value = "value" in item ? Number(item.value) : NaN;
        if (!name || !Number.isFinite(value)) return null;

        return {
          name,
          value: Math.max(0, Math.round(value)),
        };
      })
      .filter((item): item is { name: string; value: number } => item !== null);

    if (normalized.length) {
      return normalized;
    }
  }

  return distributionByLookUpRate(students);
}

function sanitizeClassStats(
  classMetric:
    | {
        avgAttendance: number;
        avgLookUpRate: number;
        avgFocusLevel: number;
        avgParticipationCount: number;
        totalStudents: number;
        distribution: unknown;
      }
    | null
    | undefined,
  fallback: {
    avgAttendance: number;
    avgLookUpRate: number;
    avgFocusLevel: number;
    avgParticipationCount: number;
  },
  students: RankedStudentMetric[],
) {
  if (!classMetric) {
    return {
      avgAttendance: sanitizeRate(fallback.avgAttendance),
      avgLookUpRate: sanitizeRate(fallback.avgLookUpRate),
      avgFocusLevel: sanitizeRate(fallback.avgFocusLevel),
      avgParticipationCount: sanitizeParticipation(fallback.avgParticipationCount),
      totalStudents: students.length,
      distribution: distributionByLookUpRate(students),
    };
  }

  return {
    avgAttendance: sanitizeRate(classMetric.avgAttendance, fallback.avgAttendance),
    avgLookUpRate: sanitizeRate(classMetric.avgLookUpRate, fallback.avgLookUpRate),
    avgFocusLevel: sanitizeRate(classMetric.avgFocusLevel, fallback.avgFocusLevel),
    avgParticipationCount: sanitizeParticipation(
      classMetric.avgParticipationCount,
      fallback.avgParticipationCount,
    ),
    totalStudents: Math.max(Number(classMetric.totalStudents) || students.length, students.length),
    distribution: sanitizeDistribution(classMetric.distribution, students),
  };
}

function distributionByLookUpRate(students: RankedStudentMetric[]) {
  const buckets = [
    { name: "0-59%", min: 0, max: 59, value: 0 },
    { name: "60-69%", min: 60, max: 69, value: 0 },
    { name: "70-79%", min: 70, max: 79, value: 0 },
    { name: "80-89%", min: 80, max: 89, value: 0 },
    { name: "90-100%", min: 90, max: 100, value: 0 },
  ];

  for (const student of students) {
    const bucket = buckets.find(
      (item) => student.lookUpRate >= item.min && student.lookUpRate <= item.max,
    );

    if (bucket) {
      bucket.value += 1;
    }
  }

  return buckets.map(({ name, value }) => ({ name, value }));
}

function buildAttendanceSummary(students: RankedStudentMetric[]) {
  const presentStudents = students.filter((student) => student.attendanceRate > 0);
  const presentStudentIds = presentStudents
    .map((student) => student.studentId ?? student.trackerId ?? student.id)
    .filter(Boolean);

  return {
    presentCount: presentStudents.length,
    absentCount: Math.max(0, students.length - presentStudents.length),
    presentStudentIds,
  };
}

function getSessionStatusLabel(status: string) {
  if (status === "running") {
    return "进行中";
  }

  if (status === "completed") {
    return "已完成";
  }

  if (status === "failed") {
    return "失败";
  }

  return "待处理";
}

function buildSessionLabel(session: {
  startedAt: Date;
  endedAt: Date | null;
  classroom: string | null;
}) {
  const start = session.startedAt.toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
  const end = session.endedAt
    ? session.endedAt.toLocaleString("zh-CN", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  const timeRange = end ? `${start} - ${end}` : start;
  return session.classroom ? `${timeRange} · ${session.classroom}` : timeRange;
}

export async function getCoursePerformance(courseId: string, sessionId?: string) {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: {
      teacher: true,
      department: true,
      courseEnrollments: {
        include: {
          student: true,
        },
      },
    },
  });

  if (!course) {
    return null;
  }

  const sessions = await prisma.inferenceSession.findMany({
    where: { courseId },
    orderBy: {
      startedAt: "desc",
    },
    include: {
      device: true,
      classMetric: true,
    },
  });

  const selectedSessionId =
    (sessionId && sessions.find((item) => item.id === sessionId)?.id) ?? sessions[0]?.id ?? null;

  const selectedSession = selectedSessionId
    ? await prisma.inferenceSession.findUnique({
        where: { id: selectedSessionId },
        include: {
          device: true,
          classMetric: true,
          studentMetrics: {
            include: {
              student: true,
            },
          },
        },
      })
    : null;

  const metricMap = new Map<string, RankedStudentMetric>();

  for (const enrollment of course.courseEnrollments) {
    if (!enrollment.student) continue;

    metricMap.set(`student:${enrollment.student.studentId}`, {
      id: enrollment.student.studentId,
      name: enrollment.student.name,
      studentId: enrollment.student.studentId,
      attendanceRate: 0,
      lookUpRate: 0,
      focusLevel: 0,
      participationCount: 0,
      score: 0,
      rank: 0,
    });
  }

  if (selectedSession) {
    for (const metric of selectedSession.studentMetrics) {
      const key = metric.studentId ? `student:${metric.studentId}` : `tracker:${metric.trackerId}`;
      metricMap.set(key, {
        id: metric.studentId ?? metric.trackerId ?? metric.id,
        name:
          metric.student?.name ??
          metric.displayName ??
          metric.studentId ??
          metric.trackerId ??
          "Unknown",
        studentId: metric.studentId ?? undefined,
        trackerId: metric.trackerId ?? undefined,
        ...normalizeStudentMetric(metric),
        rank: 0,
      });
    }
  }

  const students = Array.from(metricMap.values())
    .sort((a, b) => b.score - a.score)
    .map((student, index) => ({
      ...student,
      rank: index + 1,
    }));

  const computedClassStats = {
    avgAttendance: average(students.map((item) => item.attendanceRate)),
    avgLookUpRate: average(students.map((item) => item.lookUpRate)),
    avgFocusLevel: average(students.map((item) => item.focusLevel)),
    avgParticipationCount: average(students.map((item) => item.participationCount)),
  };

  const attendanceSummary = buildAttendanceSummary(students);

  const baseClassStats = selectedSession?.classMetric
    ? {
        avgAttendance: sanitizeRate(
          selectedSession.classMetric.avgAttendance,
          computedClassStats.avgAttendance,
        ),
        avgLookUpRate: sanitizeRate(
          selectedSession.classMetric.avgLookUpRate,
          computedClassStats.avgLookUpRate,
        ),
        avgFocusLevel: sanitizeRate(
          selectedSession.classMetric.avgFocusLevel,
          computedClassStats.avgFocusLevel,
        ),
        avgParticipationCount: sanitizeParticipation(
          selectedSession.classMetric.avgParticipationCount,
          computedClassStats.avgParticipationCount,
        ),
      }
    : computedClassStats;

  const similarCourses = await prisma.course.findMany({
    where: {
      id: { not: courseId },
      status: "active",
      OR: [
        course.departmentId ? { departmentId: course.departmentId } : undefined,
        course.teacherId ? { teacherId: course.teacherId } : undefined,
        { type: course.type },
      ].filter(Boolean) as Array<Record<string, string>>,
    },
    include: {
      teacher: true,
      inferenceSessions: {
        take: 1,
        orderBy: {
          startedAt: "desc",
        },
        include: {
          classMetric: true,
        },
      },
    },
    take: 4,
  });

  const peerCourses: PeerCourseMetric[] = similarCourses
    .map((item) => {
      const metric = item.inferenceSessions[0]?.classMetric;
      if (!metric) return null;

      const peerMetric = {
        id: item.id,
        name: item.name,
        teacherName: item.teacher?.name ?? "",
        avgAttendance: sanitizeRate(metric.avgAttendance),
        avgLookUpRate: sanitizeRate(metric.avgLookUpRate),
        avgFocusLevel: sanitizeRate(metric.avgFocusLevel),
        avgParticipationCount: sanitizeParticipation(metric.avgParticipationCount),
      };

      return {
        ...peerMetric,
        score: calculateCompositeScore(peerMetric),
      };
    })
    .filter((item): item is PeerCourseMetric => item !== null);

  return {
    course: {
      id: course.id,
      name: course.name,
      code: course.code,
      credits: course.credits,
      teacherName: course.teacher?.name ?? "",
      departmentName: course.department?.name ?? "",
      schedule: course.schedule,
      studentCount: course.studentCount,
    },
    session: selectedSession
      ? {
          id: selectedSession.id,
          status: selectedSession.status,
          statusLabel: getSessionStatusLabel(selectedSession.status),
          startedAt: selectedSession.startedAt,
          endedAt: selectedSession.endedAt,
          classroom: selectedSession.classroom,
          sourceStream: selectedSession.sourceStream,
          deviceName: selectedSession.device.name,
          label: buildSessionLabel(selectedSession),
        }
      : null,
    sessions: sessions.map((session, index) => {
      const metric = session.classMetric;
      const summary = metric
        ? {
            avgAttendance: sanitizeRate(metric.avgAttendance),
            avgLookUpRate: sanitizeRate(metric.avgLookUpRate),
            avgFocusLevel: sanitizeRate(metric.avgFocusLevel),
            avgParticipationCount: sanitizeParticipation(metric.avgParticipationCount),
            score: calculateCompositeScore({
              avgAttendance: metric.avgAttendance,
              avgLookUpRate: metric.avgLookUpRate,
              avgFocusLevel: metric.avgFocusLevel,
              avgParticipationCount: metric.avgParticipationCount,
            }),
            totalStudents: metric.totalStudents,
          }
        : null;

      return {
        id: session.id,
        index: sessions.length - index,
        label: buildSessionLabel(session),
        startedAt: session.startedAt,
        endedAt: session.endedAt,
        classroom: session.classroom,
        deviceName: session.device.name,
        status: session.status,
        statusLabel: getSessionStatusLabel(session.status),
        summary,
      };
    }),
    classStats: sanitizeClassStats(
      selectedSession?.classMetric
        ? {
            avgAttendance: selectedSession.classMetric.avgAttendance,
            avgLookUpRate: selectedSession.classMetric.avgLookUpRate,
            avgFocusLevel: selectedSession.classMetric.avgFocusLevel,
            avgParticipationCount: selectedSession.classMetric.avgParticipationCount,
            totalStudents: selectedSession.classMetric.totalStudents,
            distribution: selectedSession.classMetric.distribution,
          }
        : null,
      computedClassStats,
      students,
    ),
    peerCourses: [
      {
        id: course.id,
        name: course.name,
        teacherName: course.teacher?.name ?? "",
        ...baseClassStats,
        score: calculateCompositeScore(baseClassStats),
      },
      ...peerCourses,
    ],
    attendanceSummary,
    students,
  };
}
