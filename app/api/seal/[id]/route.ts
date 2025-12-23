import { NextRequest } from 'next/server';
import { jsonResponse } from '@/lib/apiHandler';
import { createAPIRoute } from '@/lib/routeHelper';
import { validateSealId } from '@/lib/validation';
import { isHoneypot, concurrentTracker, detectSuspiciousPattern } from '@/lib/security';
import { logger } from '@/lib/logger';
import { RATE_LIMIT_GET_SEAL } from '@/lib/constants';
import { validateAPIRequest, encodeBase64Chunked, trackAnalytics } from '@/lib/apiHelpers';


export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const securityError = validateAPIRequest(request, ['GET']);
  if (securityError) return securityError;

  return createAPIRoute(async ({ container, ip }) => {
    if (!concurrentTracker.track(ip)) {
      return jsonResponse({ error: 'Too many concurrent requests' }, { status: 429 });
    }

    try {
      const { id: sealId } = await params;

      const sealIdValidation = validateSealId(sealId);
      if (!sealIdValidation.valid) {
        return jsonResponse({ error: sealIdValidation.error }, { status: 400 });
      }

      if (detectSuspiciousPattern(ip, sealId)) {
        logger.warn('suspicious_pattern', { ip, sealId });
      }

      if (isHoneypot(sealId)) {
        logger.warn('honeypot_accessed', { ip, sealId, userAgent: request.headers.get('user-agent') });
        return jsonResponse({
          id: sealId,
          isLocked: true,
          unlockTime: Date.now() + 999999999999,
          timeRemaining: 999999999999,
        });
      }

      const sealService = container.sealService;
      
      try {
        const metadata = await sealService.getSeal(sealId, ip);

        if (metadata.status === 'locked') {
          // Add jitter to prevent timing attacks
          const jitter = Math.floor(Math.random() * 100);
          await new Promise(resolve => setTimeout(resolve, jitter));
          
          return jsonResponse({
            id: sealId,
            isLocked: true,
            unlockTime: metadata.unlockTime,
            timeRemaining: Math.max(0, metadata.unlockTime - Date.now()),
            isDMS: metadata.isDMS,
          });
        }

        const blob = await sealService.getBlob(sealId);
        const blobBase64 = encodeBase64Chunked(new Uint8Array(blob));

        await trackAnalytics(container.db, 'seal_unlocked');

        return jsonResponse({
          id: sealId,
          isLocked: false,
          unlockTime: metadata.unlockTime,
          keyB: metadata.keyB,
          iv: metadata.iv,
          encryptedBlob: blobBase64,
          isDMS: metadata.isDMS,
        });
      } catch (error) {
        console.error('[SEAL-API] Error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return jsonResponse({ error: `Seal retrieval failed: ${errorMessage}` }, { status: 500 });
      }
    } finally {
      concurrentTracker.release(ip);
    }
  }, { rateLimit: RATE_LIMIT_GET_SEAL })(request);
}
