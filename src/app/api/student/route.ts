import { createStudent, getStudents } from "@/db/db";
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
        return new Response(JSON.stringify({ error: "请至少提供一条学生数据" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      const created = [];
      const errors = [];

      for (const [index, student] of payload.entries()) {
        try {
          const createdStudent = await createStudent(student);
          created.push(createdStudent);
        } catch (error) {
          errors.push({
            index,
            studentId: student?.studentId,
            name: student?.name,
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

    const createdStudent = await createStudent(payload);

    return new Response(
      JSON.stringify({
        status: "success",
        message: "学生创建成功",
        data: createdStudent,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("创建学生失败:", error);
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
    const students = await getStudents();
    return new Response(JSON.stringify(students), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("获取学生失败:", error);
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
