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

function mapStatus(latestSessionStatus?: string | null) {
  if (latestSessionStatus === "running") {
    return {
      status: "in-progress" as const,
      label: "进行中",
      accent: "from-sky-500 to-cyan-500",
    };
  }

  if (latestSessionStatus === "completed") {
    return {
      status: "completed" as const,
      label: "已采集",
      accent: "from-emerald-500 to-teal-500",
    };
  }

  return {
    status: "pending" as const,
    label: "待接入",
    accent: "from-amber-500 to-orange-500",
  };
}

export async function GET() {
  const session = await auth();
  const user = session?.user as { id?: string; role?: number } | undefined;

  if (!user?.id) {
    return NextResponse.json({ error: "未授权访问" }, { status: 401 });
  }

  if (user.role !== 1) {
    return NextResponse.json({ error: "只有教师可以访问该接口" }, { status: 403 });
  }

  try {
    const teacher = await prisma.teacher.findUnique({
      where: { teacherId: user.id },
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
              take: 1,
              orderBy: {
                startedAt: "desc",
              },
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
      return NextResponse.json({ error: "未找到教师信息" }, { status: 404 });
    }

    const courses = teacher.courses.map((course) => {
      const latestSession = course.inferenceSessions[0];
      const { scheduleLabel, location } = normalizeSchedule(course.schedule);
      const { status, label, accent } = mapStatus(latestSession?.status);
      const metric = latestSession?.classMetric;

      return {
        id: course.id,
        name: course.name,
        code: course.code,
        type: course.type,
        description: course.description || "这门课程已经接入教师端课程面板，可查看课堂识别与表现概览。",
        departmentName: teacher.department?.name ?? teacher.departmentName ?? "未设置院系",
        teacherName: teacher.name || teacher.teacherId,
        scheduleLabel,
        location,
        studentCount: course.studentCount || course.courseEnrollments.length,
        status,
        statusLabel: label,
        accent,
        avgAttendance: metric?.avgAttendance ?? null,
        avgFocusLevel: metric?.avgFocusLevel ?? null,
        avgLookUpRate: metric?.avgLookUpRate ?? null,
        latestSessionAt: latestSession?.startedAt ?? null,
      };
    });

    const stats = {
      totalCourses: courses.length,
      activeCourses: courses.filter((course) => course.status === "in-progress").length,
      monitoredCourses: courses.filter((course) => course.status !== "pending").length,
      totalStudents: courses.reduce((sum, course) => sum + course.studentCount, 0),
    };

    return NextResponse.json({
      data: {
        teacher: {
          id: teacher.teacherId,
          name: teacher.name || teacher.teacherId,
          departmentName: teacher.department?.name ?? teacher.departmentName ?? "未设置院系",
        },
        stats,
        courses,
      },
    });
  } catch (error) {
    console.error("获取教师课程失败:", error);
    return NextResponse.json({ error: "获取教师课程失败" }, { status: 500 });
  }
}
