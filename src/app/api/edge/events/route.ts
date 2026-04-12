import { requireEdgeDevice } from "@/server/edge-auth";
import {
  ingestInferencePayload,
  type IngestInferencePayload,
} from "@/server/inference-service";

export async function POST(request: Request) {
  const deviceResult = await requireEdgeDevice(request);
  if (!deviceResult.ok) return deviceResult.response;

  try {
    const body = (await request.json()) as IngestInferencePayload;

    if (!body?.sessionId) {
      return new Response(JSON.stringify({ error: "sessionId is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const session = await ingestInferencePayload(deviceResult.device.id, body);

    return new Response(JSON.stringify({ status: "success", data: session }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to ingest inference payload";

    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
}
