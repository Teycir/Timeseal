import { NextRequest } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { handleMetricsRequest } from "@/lib/metrics";

export async function GET(request: NextRequest) {
  const { env } = await getCloudflareContext();
  const METRICS_SECRET = env.METRICS_SECRET;

  if (
    !METRICS_SECRET ||
    METRICS_SECRET === "" ||
    METRICS_SECRET === "dev-secret"
  ) {
    return new Response("Metrics disabled", { status: 404 });
  }

  const authHeader = request.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "");

  if (token !== METRICS_SECRET) {
    return new Response("Unauthorized", { status: 401 });
  }

  return handleMetricsRequest();
}
