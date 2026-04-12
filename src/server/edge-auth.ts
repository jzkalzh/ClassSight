import prisma from "@/db/db";

function readDeviceKey(request: Request) {
  const directKey = request.headers.get("x-device-key");
  if (directKey) return directKey;

  const authorization = request.headers.get("authorization");
  if (authorization?.startsWith("Bearer ")) {
    return authorization.slice("Bearer ".length).trim();
  }

  return null;
}

export async function requireEdgeDevice(request: Request) {
  const deviceKey = readDeviceKey(request);

  if (!deviceKey) {
    return {
      ok: false as const,
      response: new Response(
        JSON.stringify({ error: "Missing device credential" }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        },
      ),
    };
  }

  const device = await prisma.edgeDevice.findUnique({
    where: { deviceKey },
  });

  if (!device || device.status !== "active") {
    return {
      ok: false as const,
      response: new Response(
        JSON.stringify({ error: "Invalid device credential" }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        },
      ),
    };
  }

  return {
    ok: true as const,
    device,
  };
}
