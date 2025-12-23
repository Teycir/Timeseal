import { NextRequest } from "next/server";
import { jsonResponse } from "@/lib/apiHandler";

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  
  if (!cronSecret || cronSecret === '' || cronSecret === 'change-me') {
    return jsonResponse({ error: "CRON_SECRET not configured" }, { status: 500 });
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    return jsonResponse({ error: "Unauthorized" }, { status: 401 });
  }

  const RETENTION_DAYS = 30; // Keep seals 30 days after unlock
  const cutoffTime = Date.now() - (RETENTION_DAYS * 24 * 60 * 60 * 1000);
  const now = Date.now();

  try {
    const env = (request as any).env;
    if (!env?.DB) {
      return jsonResponse({ error: "Database not available" }, { status: 500 });
    }

    // Get seals to delete (with blobs)
    const sealsToDelete = await env.DB.prepare(
      'SELECT id FROM seals WHERE unlock_time < ?'
    ).bind(cutoffTime).all();

    let blobsDeleted = 0;
    // Delete blobs first
    for (const seal of sealsToDelete.results) {
      try {
        await env.DB.prepare(
          'UPDATE seals SET encrypted_blob = NULL WHERE id = ?'
        ).bind(seal.id).run();
        blobsDeleted++;
      } catch (error) {
        console.error(`[CRON] Failed to delete blob for seal ${seal.id}:`, error);
      }
    }

    // Then delete seal records
    const sealsResult = await env.DB.prepare(
      'DELETE FROM seals WHERE unlock_time < ?'
    ).bind(cutoffTime).run();

    // Clean up expired rate limits
    const rateLimitsResult = await env.DB.prepare(
      'DELETE FROM rate_limits WHERE reset_at < ?'
    ).bind(now).run();

    // Clean up expired nonces
    const noncesResult = await env.DB.prepare(
      'DELETE FROM nonces WHERE expires_at < ?'
    ).bind(now).run();

    return jsonResponse({
      success: true,
      sealsDeleted: sealsResult.meta.changes,
      blobsDeleted,
      rateLimitsDeleted: rateLimitsResult.meta.changes,
      noncesDeleted: noncesResult.meta.changes,
      cutoffTime: new Date(cutoffTime).toISOString(),
    });
  } catch (error) {
    console.error("[CRON] Cleanup error:", error);
    return jsonResponse({ error: "Cleanup failed" }, { status: 500 });
  }
}
