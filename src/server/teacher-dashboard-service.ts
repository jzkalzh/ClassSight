import prisma from "@/db/db";
import { getCoursePerformance } from "@/server/performance-service";

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

function getCourseStatusLabel(hasSession: boolean, sessionStatus?: string | null) {
  if (sessionStatus === "running") {
    return {
      status: "in-progress",
      statusLabel: "进行中",
    };
  }

  if (hasSession) {
    return {
      status: "completed",
      statusLabel: "已采集",
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
          courseEnrollments: {
            select: {
              id: true,
            },
          },
          inferenceSessions: {
            orderBy: {
              startedAt: "desc",
            },
            take: 1,
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
    const { scheduleLabel, location } = normalizeSchedule(course.schedule);
    const { status, statusLabel } = getCourseStatusLabel(Boolean(latestSession), latestSession?.status);

    return {
      id: course.id,
      name: course.name,
      code: course.code,
      scheduleLabel,
      location,
      studentCount: course.studentCount || course.courseEnrollments.length,
      status,
      statusLabel,
      latestSessionAt: latestSession?.startedAt ?? null,
      latestSessionStatus: latestSession?.status ?? null,
    };
  });

  const currentCourse =
    courses.find((course) => course.latestSessionStatus === "running") ??
    [...courses].sort((a, b) => {
      const left = a.latestSessionAt ? new Date(a.latestSessionAt).getTime() : 0;
      const right = b.latestSessionAt ? new Date(b.latestSessionAt).getTime() : 0;
      return right - left;
    })[0] ??
    null;

  const performanceSourceCourseId = currentCourse?.id ?? courses[0]?.id;
  const performance = performanceSourceCourseId
    ? await getCoursePerformance(performanceSourceCourseId)
    : null;

  const topStudents = performance?.students.slice(0, 6) ?? [];
  const attentionStudents =
    performance?.students
      .filter((student) => student.attendanceRate < 60 || student.focusLevel < 60)
      .sort((a, b) => a.score - b.score)
      .slice(0, 5) ?? [];

  return {
    teacher: {
      id: teacher.teacherId,
      name: teacher.name,
      departmentName: teacher.department?.name ?? teacher.departmentName ?? "未设置院系",
      rank: teacher.rank || "教师",
      courseCount: courses.length,
    },
    courseOverview: {
      currentCourse,
      todayCourses: courses.slice(0, 4),
      monitoredCourseCount: courses.filter((course) => course.latestSessionAt).length,
    },
    performance: performance
      ? {
          courseId: performance.course.id,
          courseName: performance.course.name,
          courseCode: performance.course.code,
          session: performance.session,
          classStats: performance.classStats,
          attendanceSummary: performance.attendanceSummary,
          students: performance.students,
          topStudents,
          attentionStudents,
        }
      : null,
  };
}
