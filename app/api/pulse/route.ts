import { NextRequest, NextResponse } from 'next/server';
import { createContainer } from '@/lib/container';
import { createHandler, jsonResponse, HandlerContext } from '@/lib/apiHandler';
import { withRateLimit } from '@/lib/rateLimit';
import { ErrorCode, createErrorResponse } from '@/lib/errors';

export const runtime = 'edge';

export async function POST(request: NextRequest) {
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  
  return withRateLimit(
    request,
    async () => {
      const handler = createHandler(async (ctx: HandlerContext) => {
        const { pulseToken } = await ctx.request.json();

        if (!pulseToken) {
          return createErrorResponse(ErrorCode.INVALID_INPUT, 'Pulse token required');
        }

        const container = createContainer(ctx.env);
        const sealService: any = container.resolve('sealService');

        const result = await sealService.pulseSeal(pulseToken, ctx.ip);

        return jsonResponse({
          success: true,
          newUnlockTime: result.newUnlockTime,
          message: 'Pulse updated successfully',
        });
      });

      return handler({ request, ip, env: undefined });
    },
    { limit: 20, window: 60000 }
  );
}