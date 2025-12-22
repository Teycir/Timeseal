export const runtime = 'edge';
import { NextRequest } from 'next/server';
import { jsonResponse } from '@/lib/apiHandler';
import { createAPIRoute } from '@/lib/routeHelper';
import { validateFileSize, validateUnlockTime } from '@/lib/validation';
import { ErrorCode, createErrorResponse } from '@/lib/errors';


export async function POST(request: NextRequest) {
  const contentLength = request.headers.get('content-length');
  const maxSize = parseInt(process.env.MAX_FILE_SIZE_MB || '10') * 1024 * 1024;
  
  if (contentLength && parseInt(contentLength) > maxSize) {
    return jsonResponse({ 
      error: `Request body exceeds maximum size of ${maxSize / 1024 / 1024}MB` 
    }, 413);
  }
  
  return createAPIRoute(async ({ container, request: ctx, ip }) => {
    const formData = await ctx.formData();
    const encryptedBlob = formData.get('encryptedBlob') as File;
    const keyB = formData.get('keyB') as string;
    const iv = formData.get('iv') as string;
    const unlockTime = parseInt(formData.get('unlockTime') as string);
    const isDMS = formData.get('isDMS') === 'true';
    const pulseInterval = formData.get('pulseInterval') ? 
      parseInt(formData.get('pulseInterval') as string) : undefined;

    if (!encryptedBlob || !keyB || !iv || !unlockTime || isNaN(unlockTime)) {
      return createErrorResponse(ErrorCode.INVALID_UNLOCK_TIME, 'Missing required fields');
    }

    const sizeValidation = validateFileSize(encryptedBlob.size);
    if (!sizeValidation.valid) {
      return jsonResponse({ error: sizeValidation.error }, 400);
    }

    const timeValidation = validateUnlockTime(unlockTime);
    if (!timeValidation.valid) {
      return createErrorResponse(ErrorCode.INVALID_UNLOCK_TIME, timeValidation.error);
    }

    const sealService = container.sealService;
    const blobBuffer = await encryptedBlob.arrayBuffer();
    const result = await sealService.createSeal({
      encryptedBlob: blobBuffer,
      keyB,
      iv,
      unlockTime,
      isDMS,
      pulseInterval,
    }, ip);

    return jsonResponse({
      success: true,
      sealId: result.sealId,
      iv: result.iv,
      publicUrl: `/v/${result.sealId}`,
      pulseUrl: result.pulseToken ? `/pulse/${result.pulseToken}` : undefined,
    });
  }, { rateLimit: { limit: 10, window: 60000 } })(request);
}
