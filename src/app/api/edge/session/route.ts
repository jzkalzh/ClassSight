import { requireEdgeDevice } from "@/server/edge-auth";
import {
  startInferenceSession,
  type StartInferenceSessionInput,
} from "@/server/inference-service";

export async function POST(request: Request) {
  const deviceResult = await requireEdgeDevice(request);
  if (!deviceResult.ok) return deviceResult.response;

  try {
    const body = (await request.json()) as StartInferenceSessionInput;
    const session = await startInferenceSession(deviceResult.device.id, body ?? {});

    return new Response(JSON.stringify({ status: "success", data: session }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to start inference session";

    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
}
