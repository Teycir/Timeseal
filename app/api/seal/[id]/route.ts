import { NextRequest, NextResponse } from 'next/server';
import { createContainer } from '@/lib/container';
import { createHandler, jsonResponse, HandlerContext } from '@/lib/apiHandler';
import { withRateLimit } from '@/lib/rateLimit';
import { ErrorCode, createErrorResponse } from '@/lib/errors';

export const runtime = 'edge';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  
  return withRateLimit(
    request,
    async () => {
      const handler = createHandler(async (ctx: HandlerContext) => {
        const { id: sealId } = await params;

        const container = createContainer(ctx.env);
        const sealService: any = container.resolve('sealService');

        const metadata = await sealService.getSeal(sealId, ctx.ip);

        if (metadata.status === 'locked') {
          return jsonResponse({
            id: sealId,
            isLocked: true,
            unlockTime: metadata.unlockTime,
            timeRemaining: metadata.unlockTime - Date.now(),
          });
        }

        const blob = await sealService.getBlob(sealId);
        const bytes = new Uint8Array(blob);
        const blobBase64 = btoa(String.fromCharCode(...bytes));

        return jsonResponse({
          id: sealId,
          isLocked: false,
          unlockTime: metadata.unlockTime,
          keyB: metadata.keyB,
          iv: metadata.iv,
          encryptedBlob: blobBase64,
        });
      });

      return handler({ request, ip, env: undefined });
    },
    { limit: 20, window: 60000 } // 20 requests per minute
  );
}
