import { isLogin } from "@/utils/isLogin";
import { getCoursePerformance } from "@/server/performance-service";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const loginStatus = await isLogin();
  if (loginStatus === 0) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const { id } = await context.params;
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("sessionId") || undefined;
    const performance = await getCoursePerformance(id, sessionId);

    if (!performance) {
      return new Response(JSON.stringify({ error: "Course not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ status: "success", data: performance }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to query course performance";

    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
