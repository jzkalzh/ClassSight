import { NextResponse } from "next/server";
import { auth } from "@/auth/auth";
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

  return {
    scheduleLabel: [day, time].filter(Boolean).join(" ") || "待排课",
    location,
  };
}

function avg(values: number[]) {
  if (!values.length) return 0;
  return Number((values.reduce((sum, item) => sum + item, 0) / values.length).toFixed(1));
}

export async function GET() {
  const session = await auth();
  const user = session?.user as { id?: string; role?: number } | undefined;

  if (!user?.id) {
    return NextResponse.json({ error: "未授权访问" }, { status: 401 });
  }

  if (user.role !== 0) {
    return NextResponse.json({ error: "只有学生可以访问该接口" }, { status: 403 });
  }

  try {
    const student = await prisma.student.findUnique({
      where: { studentId: user.id },
      include: {
        department: true,
        courseEnrollments: {
          where: { status: "enrolled" },
          include: {
            course: {
              include: {
                teacher: true,
                inferenceSessions: {
                  orderBy: { startedAt: "desc" },
                  take: 1,
                  include: {
                    studentMetrics: {
                      where: {
                        OR: [{ studentId: user.id }, { trackerId: user.id }],
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!student) {
      return NextResponse.json({ error: "未找到学生信息" }, { status: 404 });
    }

    const courses = student.courseEnrollments
      .map((enrollment) => enrollment.course)
      .filter(Boolean)
      .map((course) => {
        const normalized = normalizeSchedule(course.schedule);
        const latestSession = course.inferenceSessions[0];
        const latestMetric = latestSession?.studentMetrics[0];

        return {
          id: course.id,
          name: course.name,
          code: course.code,
          teacherName: course.teacher?.name || course.teacherId || "教师",
          scheduleLabel: normalized.scheduleLabel,
          location: normalized.location,
          status:
            latestSession?.status === "running"
              ? "in-progress"
              : latestSession?.status === "completed"
                ? "completed"
                : "pending",
          metrics: latestMetric
            ? {
                attendanceRate: latestMetric.attendanceRate,
                focusLevel: latestMetric.focusLevel,
                lookUpRate: latestMetric.lookUpRate,
                score: latestMetric.score,
              }
            : null,
        };
      });

    const currentCourse =
      courses.find((course) => course.status === "in-progress") ??
      courses.find((course) => course.status === "completed") ??
      courses[0] ??
      null;

    const allMetrics = courses.map((course) => course.metrics).filter(Boolean);
    const attendance = avg(allMetrics.map((item) => item!.attendanceRate));
    const focusLevel = avg(allMetrics.map((item) => item!.focusLevel));
    const score = avg(allMetrics.map((item) => item!.score));

    return NextResponse.json({
      data: {
        student: {
          id: student.studentId,
          name: student.name || student.studentId,
          className: student.class || "",
          major: student.major || "",
          departmentName: student.department?.name || "",
        },
        overview: {
          attendanceRate: attendance,
          focusLevel,
          score,
          courseCount: courses.length,
        },
        currentCourse,
        todayCourses: courses.slice(0, 6),
        courses,
      },
    });
  } catch (error) {
    console.error("获取学生首页数据失败:", error);
    return NextResponse.json({ error: "获取学生首页数据失败" }, { status: 500 });
  }
}
