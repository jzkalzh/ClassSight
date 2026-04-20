import prisma from "@/db/db";

type ScheduleShape = {
  day?: string;
  weekDay?: string;
  time?: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  classroom?: string;
  room?: string;
};

function parseScheduleRaw(raw: unknown): unknown {
  if (typeof raw !== "string") {
    return raw;
  }

  const value = raw.trim();
  if (!value.startsWith("[") && !value.startsWith("{")) {
    return raw;
  }

  try {
    return JSON.parse(value);
  } catch {
    return raw;
  }
}

function normalizeSchedule(raw: unknown) {
  const parsedRaw = parseScheduleRaw(raw);

  if (!parsedRaw) {
    return {
      scheduleLabel: "待排课",
      location: "教室待定",
    };
  }

  if (typeof parsedRaw === "string") {
    return {
      scheduleLabel: parsedRaw,
      location: "教室待定",
    };
  }

  const item = (Array.isArray(parsedRaw) ? parsedRaw[0] : parsedRaw) as ScheduleShape | undefined;
  if (!item || typeof item !== "object") {
    return {
      scheduleLabel: "待排课",
      location: "教室待定",
    };
  }

  const day = item.day || item.weekDay || "";
  const time =
    item.time ||
    (item.startTime && item.endTime ? `${item.startTime}-${item.endTime}` : item.startTime || "");
  const location = item.location || item.classroom || item.room || "教室待定";
  const scheduleLabel = [day, time].filter(Boolean).join(" ");

  return {
    scheduleLabel: scheduleLabel || "待排课",
    location,
  };
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

function average(values: number[]) {
  if (!values.length) return 0;
  return Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(2));
}

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

function getCourseStatus(hasSession: boolean, sessionStatus?: string | null) {
  if (sessionStatus === "running") {
    return {
      status: "in-progress",
      statusLabel: "进行中",
    };
  }

  if (hasSession) {
    return {
      status: "completed",
      statusLabel: "已有数据",
    };
  }

  return {
    status: "pending",
    statusLabel: "待采集",
  };
}

export async function getTeacherDashboard(teacherId: string) {
  const teacher = await prisma.teacher.findUnique({
    where: { teacherId },
    include: {
      department: true,
      courses: {
        include: {
          _count: {
            select: {
              courseEnrollments: true,
              inferenceSessions: true,
            },
          },
          inferenceSessions: {
            orderBy: {
              startedAt: "desc",
            },
            take: 1,
            include: {
              classMetric: true,
            },
          },
        },
        orderBy: {
          updatedAt: "desc",
        },
      },
    },
  });

  if (!teacher) {
    return null;
  }

  const courses = teacher.courses.map((course) => {
    const latestSession = course.inferenceSessions[0];
    const latestMetric = latestSession?.classMetric;
    const { scheduleLabel, location } = normalizeSchedule(course.schedule);
    const { status, statusLabel } = getCourseStatus(Boolean(latestSession), latestSession?.status);

    return {
      id: course.id,
      name: course.name,
      code: course.code,
      scheduleLabel,
      location,
      studentCount: course.studentCount || course._count.courseEnrollments,
      sessionCount: course._count.inferenceSessions,
      latestSessionAt: latestSession?.startedAt ?? null,
      latestSessionStatus: latestSession?.status ?? null,
      status,
      statusLabel,
      metrics: latestMetric
        ? {
            avgAttendance: sanitizeRate(latestMetric.avgAttendance),
            avgLookUpRate: sanitizeRate(latestMetric.avgLookUpRate),
            avgFocusLevel: sanitizeRate(latestMetric.avgFocusLevel),
            avgParticipationCount: sanitizeParticipation(latestMetric.avgParticipationCount),
            totalStudents: latestMetric.totalStudents,
            score: calculateCompositeScore({
              avgAttendance: sanitizeRate(latestMetric.avgAttendance),
              avgLookUpRate: sanitizeRate(latestMetric.avgLookUpRate),
              avgFocusLevel: sanitizeRate(latestMetric.avgFocusLevel),
              avgParticipationCount: sanitizeParticipation(latestMetric.avgParticipationCount),
            }),
          }
        : null,
    };
  });

  const monitoredCourses = courses.filter((course) => course.metrics);
  const scores = monitoredCourses.map((course) => course.metrics?.score ?? 0);
  const attendances = monitoredCourses.map((course) => course.metrics?.avgAttendance ?? 0);
  const focuses = monitoredCourses.map((course) => course.metrics?.avgFocusLevel ?? 0);
  const interactions = monitoredCourses.map((course) => course.metrics?.avgParticipationCount ?? 0);

  return {
    teacher: {
      id: teacher.teacherId,
      name: teacher.name,
      departmentName: teacher.department?.name ?? teacher.departmentName ?? "未设置院系",
      rank: teacher.rank || "教师",
      courseCount: courses.length,
    },
    overview: {
      courseCount: courses.length,
      monitoredCourseCount: monitoredCourses.length,
      averageScore: average(scores),
      averageAttendance: average(attendances),
      averageFocusLevel: average(focuses),
      averageParticipationCount: average(interactions),
    },
    courses,
  };
}
