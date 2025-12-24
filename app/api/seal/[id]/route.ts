import { NextRequest } from "next/server";
import { jsonResponse } from "@/lib/apiHandler";
import { createAPIRoute } from "@/lib/routeHelper";
import { validateSealId } from "@/lib/validation";
import {
  isHoneypot,
  concurrentTracker,
  detectSuspiciousPattern,
} from "@/lib/security";
import { logger } from "@/lib/logger";
import { RATE_LIMIT_GET_SEAL } from "@/lib/constants";
import {
  validateAPIRequest,
  encodeBase64Chunked,
  trackAnalytics,
} from "@/lib/apiHelpers";
import { generateFingerprint } from "@/lib/ephemeral";
import { handleAPIError } from "@/lib/errorHandler";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const securityError = validateAPIRequest(request, ["GET"]);
  if (securityError) return securityError;

  return createAPIRoute(
    async ({ container, ip }) => {
      if (!concurrentTracker.track(ip)) {
        return jsonResponse(
          { error: "Too many concurrent requests" },
          { status: 429 },
        );
      }

      try {
        const { id: sealId } = await params;

        const sealIdValidation = validateSealId(sealId);
        if (!sealIdValidation.valid) {
          return jsonResponse(
            { error: sealIdValidation.error },
            { status: 400 },
          );
        }

        if (detectSuspiciousPattern(ip, sealId)) {
          logger.warn("suspicious_pattern", { ip, sealId });
        }

        if (isHoneypot(sealId)) {
          logger.warn("honeypot_accessed", {
            ip,
            sealId,
            userAgent: request.headers.get("user-agent"),
          });
          return jsonResponse({
            id: sealId,
            isLocked: true,
            unlockTime: Date.now() + 999999999999,
            timeRemaining: 999999999999,
          });
        }

        const fingerprint = await generateFingerprint(request);
        const sealService = container.sealService;

        try {
          const metadata = await sealService.getSeal(sealId, ip, fingerprint);

          // Handle exhausted ephemeral seals
          if (metadata.status === "exhausted") {
            return jsonResponse(
              {
                id: sealId,
                isExhausted: true,
                isEphemeral: true,
                viewCount: metadata.viewCount,
                maxViews: metadata.maxViews,
                firstViewedAt: metadata.firstViewedAt,
                message:
                  "This ephemeral seal has been viewed and self-destructed",
              },
              { status: 410 },
            );
          }

          if (metadata.status === "locked") {
            // Add jitter to prevent timing attacks
            const jitter = Math.floor(Math.random() * 100);
            await new Promise((resolve) => setTimeout(resolve, jitter));

            return jsonResponse({
              id: sealId,
              isLocked: true,
              unlockTime: metadata.unlockTime,
              timeRemaining: Math.max(0, metadata.unlockTime - Date.now()),
              isDMS: metadata.isDMS,
              isEphemeral: metadata.isEphemeral,
              maxViews: metadata.maxViews,
              remainingViews: metadata.remainingViews,
            });
          }

          // CRITICAL FIX: Use blob from metadata if available (ephemeral deletion)
          const blob = metadata.blob || await sealService.getBlob(sealId);
          
          // Verify blob integrity if hash is available
          if (metadata.blobHash) {
            const blobArray = new Uint8Array(blob);
            const hashBuffer = await crypto.subtle.digest('SHA-256', blobArray);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            const computedHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
            
            if (computedHash !== metadata.blobHash) {
              logger.error('blob_integrity_failed', new Error('Hash mismatch'), { sealId, expected: metadata.blobHash, actual: computedHash });
              return jsonResponse(
                { error: 'Blob integrity verification failed. Data may be corrupted.' },
                { status: 500 }
              );
            }
          }
          
          const blobBase64 = encodeBase64Chunked(new Uint8Array(blob));

          await trackAnalytics(container.db, "seal_unlocked");

          return jsonResponse({
            id: sealId,
            isLocked: false,
            unlockTime: metadata.unlockTime,
            keyB: metadata.keyB,
            iv: metadata.iv,
            encryptedBlob: blobBase64,
            isDMS: metadata.isDMS,
            isEphemeral: metadata.isEphemeral,
            viewCount: metadata.viewCount,
            maxViews: metadata.maxViews,
            remainingViews: metadata.remainingViews,
          });
        } catch (error) {
          return handleAPIError(error, {
            component: 'seal',
            action: 'GET /api/seal/[id]',
            ip,
            sealId,
          });
        }
      } finally {
        concurrentTracker.release(ip);
      }
    },
    { rateLimit: RATE_LIMIT_GET_SEAL },
  )(request);
}
