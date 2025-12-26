import { getCloudflareContext } from "@opennextjs/cloudflare";
import { jsonResponse } from "@/lib/apiHandler";
import { storageCircuitBreaker } from "@/lib/circuitBreaker";
import { metrics } from "@/lib/metrics";

export async function GET() {
  try {
    const { env } = getCloudflareContext();
    const nonCriticalFailures = metrics.getNonCriticalFailures();
    const hasDegradation = metrics.hasHighFailureRate();

    return jsonResponse(
      {
        status: hasDegradation ? "degraded" : "healthy",
        timestamp: Date.now(),
        version: "0.9.3",
        services: {
          storage: storageCircuitBreaker.getState(),
          database: env?.DB ? "operational" : "not configured",
          encryption: env?.MASTER_ENCRYPTION_KEY ? "configured" : "missing",
        },
        nonCriticalFailures,
      },
      { status: hasDegradation ? 503 : 200 },
    );
  } catch (error) {
    return jsonResponse(
      {
        status: "error",
        error: String(error),
      },
      { status: 500 },
    );
  }
}
