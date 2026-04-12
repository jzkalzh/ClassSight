import { requireEdgeDevice } from "@/server/edge-auth";
import {
  closeInferenceSession,
  type CloseInferenceSessionInput,
} from "@/server/inference-service";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const deviceResult = await requireEdgeDevice(request);
  if (!deviceResult.ok) return deviceResult.response;

  try {
    const { id } = await context.params;
    const body = (await request.json()) as CloseInferenceSessionInput;
    const session = await closeInferenceSession(deviceResult.device.id, id, body ?? {});

    return new Response(JSON.stringify({ status: "success", data: session }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to close inference session";

    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
}
