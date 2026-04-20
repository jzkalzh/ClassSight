import { createTeacher, getTeachers } from "@/db/db";
import { isLogin } from "@/utils/isLogin";

export async function POST(req: Request) {
  const loginStatus = await isLogin();
  if (loginStatus === 0) {
    return new Response(JSON.stringify({ error: "未授权访问" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const payload = await req.json();

    if (!payload || typeof payload !== "object") {
      return new Response(JSON.stringify({ error: "无效的请求数据" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (Array.isArray(payload)) {
      if (payload.length === 0) {
        return new Response(JSON.stringify({ error: "请至少提供一条教师数据" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      const created = [];
      const errors = [];

      for (const [index, teacher] of payload.entries()) {
        try {
          const createdTeacher = await createTeacher(teacher);
          created.push(createdTeacher);
        } catch (error) {
          errors.push({
            index,
            teacherId: teacher?.teacherId,
            name: teacher?.name,
            error: error instanceof Error ? error.message : "创建失败",
          });
        }
      }

      return new Response(
        JSON.stringify({
          status: created.length > 0 ? "success" : "error",
          message: `批量添加完成，成功 ${created.length} 条，失败 ${errors.length} 条`,
          data: created,
          summary: {
            total: payload.length,
            created: created.length,
            failed: errors.length,
          },
          errors,
        }),
        {
          status: created.length > 0 ? 200 : 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const createdTeacher = await createTeacher(payload);

    return new Response(
      JSON.stringify({
        status: "success",
        message: "教师创建成功",
        data: createdTeacher,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("创建教师失败:", error);
    const errorMessage =
      process.env.NODE_ENV === "development" && error instanceof Error
        ? error.message
        : "服务器内部错误";

    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export async function GET() {
  const loginStatus = await isLogin();
  if (loginStatus === 0) {
    return new Response(JSON.stringify({ error: "未授权访问" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const teachers = await getTeachers();

    return new Response(
      JSON.stringify({
        status: "success",
        data: teachers,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("获取教师列表失败:", error);
    const errorMessage =
      process.env.NODE_ENV === "development" && error instanceof Error
        ? error.message
        : "服务器内部错误";

    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
