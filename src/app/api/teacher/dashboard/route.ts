import { NextResponse } from "next/server";
import { auth } from "@/auth/auth";
import { getTeacherDashboard } from "@/server/teacher-dashboard-service";

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
    const dashboard = await getTeacherDashboard(user.id);

    if (!dashboard) {
      return NextResponse.json({ error: "未找到教师信息" }, { status: 404 });
    }

    return NextResponse.json({ data: dashboard });
  } catch (error) {
    console.error("获取教师首页数据失败:", error);
    return NextResponse.json({ error: "获取教师首页数据失败" }, { status: 500 });
  }
}
