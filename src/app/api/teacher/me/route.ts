import { NextResponse } from "next/server";
import { auth } from "@/auth/auth";
import prisma from "@/db/db";

async function getCurrentTeacher() {
  const session = await auth();
  const user = session?.user as { id?: string; role?: number } | undefined;

  if (!user?.id) {
    return { error: "未授权访问", status: 401 as const };
  }

  if (user.role !== 1) {
    return { error: "只有教师可以访问该接口", status: 403 as const };
  }

  const teacher = await prisma.teacher.findUnique({
    where: { teacherId: user.id },
    include: {
      department: true,
      courses: true,
    },
  });

  if (!teacher) {
    return { error: "未找到教师信息", status: 404 as const };
  }

  return { teacher };
}

function mapTeacher(teacher: Awaited<ReturnType<typeof prisma.teacher.findUnique>> & { courses?: { id: string }[] } ) {
  return {
    id: teacher?.teacherId || "",
    name: teacher?.name || "",
    departmentName: teacher?.department?.name ?? teacher?.departmentName ?? "",
    rank: teacher?.rank || "",
    courseCount: teacher?.courses?.length ?? 0,
    email: teacher?.email || "",
    phone: teacher?.phone || "",
    office: teacher?.office || "",
  };
}

export async function GET() {
  const result = await getCurrentTeacher();

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ data: mapTeacher(result.teacher) });
}

export async function PATCH(req: Request) {
  const result = await getCurrentTeacher();

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  try {
    const body = (await req.json()) as {
      name?: string;
      departmentName?: string;
      rank?: string;
      email?: string;
      phone?: string;
      office?: string;
    };

    const name = body.name?.trim() || "";
    const departmentName = body.departmentName?.trim() || "";
    const rank = body.rank?.trim() || "";
    const email = body.email?.trim() || "";
    const phone = body.phone?.trim() || "";
    const office = body.office?.trim() || "";

    if (!name) {
      return NextResponse.json({ error: "教师姓名不能为空" }, { status: 400 });
    }

    const matchedDepartment = departmentName
      ? await prisma.department.findFirst({
          where: { name: departmentName },
        })
      : null;

    const updated = await prisma.teacher.update({
      where: { teacherId: result.teacher.teacherId },
      data: {
        name,
        departmentId: matchedDepartment?.id ?? null,
        departmentName,
        rank,
        email: email || `${result.teacher.teacherId}@teacher.classsight.local`,
        phone: phone || null,
        office: office || null,
      },
      include: {
        department: true,
        courses: true,
      },
    });

    return NextResponse.json({ data: mapTeacher(updated) });
  } catch (error) {
    console.error("更新教师资料失败:", error);
    return NextResponse.json({ error: "更新教师资料失败" }, { status: 500 });
  }
}
