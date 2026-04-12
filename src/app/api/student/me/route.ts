import { NextResponse } from "next/server";
import { auth } from "@/auth/auth";
import prisma from "@/db/db";

async function getCurrentStudent() {
  const session = await auth();
  const user = session?.user as { id?: string; role?: number } | undefined;

  if (!user?.id) {
    return { error: "未授权访问", status: 401 as const };
  }

  if (user.role !== 0) {
    return { error: "只有学生可以访问该接口", status: 403 as const };
  }

  const student = await prisma.student.findUnique({
    where: { studentId: user.id },
    include: {
      department: true,
      courseEnrollments: true,
    },
  });

  if (!student) {
    return { error: "未找到学生信息", status: 404 as const };
  }

  return { student };
}

function mapStudent(
  student: Awaited<ReturnType<typeof prisma.student.findUnique>> & { courseEnrollments?: { id: string }[] },
) {
  return {
    id: student?.studentId || "",
    name: student?.name || "",
    departmentName: student?.department?.name || "",
    major: student?.major || "",
    grade: student?.grade || "",
    className: student?.class || "",
    email: student?.email || "",
    phone: student?.phone || "",
    courseCount: student?.courseEnrollments?.length ?? 0,
  };
}

export async function GET() {
  const result = await getCurrentStudent();

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ data: mapStudent(result.student) });
}

export async function PATCH(req: Request) {
  const result = await getCurrentStudent();

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  try {
    const body = (await req.json()) as {
      name?: string;
      major?: string;
      grade?: string;
      className?: string;
      email?: string;
      phone?: string;
    };

    const name = body.name?.trim() || "";
    const major = body.major?.trim() || "";
    const grade = body.grade?.trim() || "";
    const className = body.className?.trim() || "";
    const email = body.email?.trim() || "";
    const phone = body.phone?.trim() || "";

    if (!name) {
      return NextResponse.json({ error: "学生姓名不能为空" }, { status: 400 });
    }

    const updated = await prisma.student.update({
      where: { studentId: result.student.studentId },
      data: {
        name,
        major,
        grade,
        class: className,
        email: email || `${result.student.studentId}@student.classsight.local`,
        phone: phone || null,
      },
      include: {
        department: true,
        courseEnrollments: true,
      },
    });

    return NextResponse.json({ data: mapStudent(updated) });
  } catch (error) {
    console.error("更新学生资料失败:", error);
    return NextResponse.json({ error: "更新学生资料失败" }, { status: 500 });
  }
}

