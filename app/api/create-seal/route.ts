import { NextRequest, NextResponse } from 'next/server';
import { createContainer } from '@/lib/container';
import { createHandler, jsonResponse, HandlerContext } from '@/lib/apiHandler';
import { withRateLimit } from '@/lib/rateLimit';
import { validateFileSize, validateUnlockTime } from '@/lib/validation';
import { ErrorCode, createErrorResponse } from '@/lib/errors';

export const runtime = 'edge';

export async function POST(request: NextRequest) {
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  
  return withRateLimit(
    request,
    async () => {
      const handler = createHandler(async (ctx: HandlerContext) => {
        const formData = await ctx.request.formData();
        const encryptedBlob = formData.get('encryptedBlob') as File;
        const keyB = formData.get('keyB') as string;
        const iv = formData.get('iv') as string;
        const unlockTime = parseInt(formData.get('unlockTime') as string);
        const isDMS = formData.get('isDMS') === 'true';
        const pulseInterval = formData.get('pulseInterval') ? 
          parseInt(formData.get('pulseInterval') as string) : undefined;

        // Validate required fields
        if (!encryptedBlob || !keyB || !iv || !unlockTime || isNaN(unlockTime)) {
          return createErrorResponse(ErrorCode.INVALID_UNLOCK_TIME, 'Missing required fields');
        }

        const sizeValidation = validateFileSize(encryptedBlob.size);
        if (!sizeValidation.valid) {
          return jsonResponse({ error: sizeValidation.error }, 400);
        }

        // Validate unlock time
        const timeValidation = validateUnlockTime(unlockTime);
        if (!timeValidation.valid) {
          return createErrorResponse(ErrorCode.INVALID_UNLOCK_TIME, timeValidation.error);
        }

        // Initialize services
        const container = createContainer(ctx.env);
        const sealService: any = container.resolve('sealService');

        // Create seal
        const blobBuffer = await encryptedBlob.arrayBuffer();
        const result = await sealService.createSeal({
          encryptedBlob: blobBuffer,
          keyB,
          iv,
          unlockTime,
          isDMS,
          pulseInterval,
        }, ctx.ip);

        return jsonResponse({
          success: true,
          sealId: result.sealId,
          iv: result.iv,
          publicUrl: `/v/${result.sealId}`,
          pulseUrl: result.pulseToken ? `/pulse/${result.pulseToken}` : undefined,
        });
      });

      return handler({ request, ip, env: undefined });
    },
    { limit: 10, window: 60000 }
  );
}
