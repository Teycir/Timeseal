import { NextRequest } from "next/server";
import { jsonResponse } from "@/lib/apiHandler";

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET || "change-me";
  
  if (authHeader !== `Bearer ${cronSecret}`) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  const RETENTION_DAYS = 30; // Keep seals 30 days after unlock
  const cutoffTime = Date.now() - (RETENTION_DAYS * 24 * 60 * 60 * 1000);

  try {
    const env = (request as any).env;
    if (!env?.DB) {
      return jsonResponse({ error: "Database not available" }, 500);
    }

    // Delete seals that unlocked more than 30 days ago
    const result = await env.DB.prepare(
      'DELETE FROM seals WHERE unlockTime < ?'
    ).bind(cutoffTime).run();

    return jsonResponse({
      success: true,
      deleted: result.meta.changes,
      cutoffTime: new Date(cutoffTime).toISOString(),
    });
  } catch (error) {
    console.error("[CRON] Cleanup error:", error);
    return jsonResponse({ error: "Cleanup failed" }, 500);
  }
}
