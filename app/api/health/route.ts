import { getCloudflareContext } from "@opennextjs/cloudflare";
import { jsonResponse } from "@/lib/apiHandler";
import { storageCircuitBreaker } from "@/lib/circuitBreaker";
import { metrics } from "@/lib/metrics";
import { logger } from "@/lib/logger";

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
    console.error("[Health Check] Error:", error);
    logger.error('health_check_error', error as Error, {
      endpoint: '/api/health',
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return jsonResponse(
      {
        status: "error",
        error: String(error),
      },
      { status: 500 },
    );
  }
}
