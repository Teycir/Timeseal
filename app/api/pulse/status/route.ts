import { NextRequest } from 'next/server';
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
        const database: any = container.resolve('database');

        const seal = await database.getSealByPulseToken(pulseToken);
        
        if (!seal) {
          return createErrorResponse(ErrorCode.SEAL_NOT_FOUND, 'Invalid pulse token');
        }

        const now = Date.now();
        const timeRemaining = seal.unlockTime - now;

        return jsonResponse({
          unlockTime: seal.unlockTime,
          timeRemaining: Math.max(0, timeRemaining),
          pulseInterval: seal.pulseInterval,
        });
      });

      return handler({ request, ip, env: undefined });
    },
    { limit: 20, window: 60000 }
  );
}
