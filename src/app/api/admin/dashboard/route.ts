import { NextResponse } from "next/server";
import { auth } from "@/auth/auth";
import prisma from "@/db/db";

export async function GET() {
  const session = await auth();
  const user = session?.user as { id?: string; role?: number } | undefined;

  if (!user?.id) {
    return NextResponse.json({ error: "未授权访问" }, { status: 401 });
  }

  if (user.role !== 2) {
    return NextResponse.json({ error: "只有管理员可以访问该接口" }, { status: 403 });
  }

  try {
    const [admin, totalStudents, totalTeachers, totalCourses, totalDepartments] = await Promise.all([
      prisma.admin.findUnique({ where: { adminId: user.id } }),
      prisma.student.count(),
      prisma.teacher.count(),
      prisma.course.count(),
      prisma.department.count(),
    ]);

    if (!admin) {
      return NextResponse.json({ error: "未找到管理员信息" }, { status: 404 });
    }

    const [recentStudents, recentTeachers, recentCourses] = await Promise.all([
      prisma.student.findMany({
        orderBy: { createdAt: "desc" },
        take: 3,
        select: { studentId: true, name: true, createdAt: true },
      }),
      prisma.teacher.findMany({
        orderBy: { createdAt: "desc" },
        take: 3,
        select: { teacherId: true, name: true, createdAt: true },
      }),
      prisma.course.findMany({
        orderBy: { createdAt: "desc" },
        take: 3,
        select: { id: true, name: true, code: true, createdAt: true },
      }),
    ]);

    const recentActivities = [
      ...recentStudents.map((item) => ({
        id: `student-${item.studentId}`,
        description: `新增学生：${item.name || item.studentId}`,
        createdAt: item.createdAt,
      })),
      ...recentTeachers.map((item) => ({
        id: `teacher-${item.teacherId}`,
        description: `新增教师：${item.name || item.teacherId}`,
        createdAt: item.createdAt,
      })),
      ...recentCourses.map((item) => ({
        id: `course-${item.id}`,
        description: `新增课程：${item.name}（${item.code}）`,
        createdAt: item.createdAt,
      })),
    ]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 8)
      .map((item) => ({
        id: item.id,
        description: item.description,
        time: new Date(item.createdAt).toLocaleString("zh-CN", { hour12: false }),
      }));

    return NextResponse.json({
      data: {
        admin: {
          id: admin.adminId,
          name: admin.name || admin.adminId,
          role: "系统管理员",
        },
        stats: {
          totalStudents,
          totalTeachers,
          totalCourses,
          totalDepartments,
        },
        recentActivities,
      },
    });
  } catch (error) {
    console.error("获取管理员首页数据失败:", error);
    return NextResponse.json({ error: "获取管理员首页数据失败" }, { status: 500 });
  }
}

