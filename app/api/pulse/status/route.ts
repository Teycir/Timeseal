export const runtime = 'edge';
import { NextRequest } from 'next/server';
import { jsonResponse } from '@/lib/apiHandler';
import { createAPIRoute } from '@/lib/routeHelper';
import { ErrorCode, createErrorResponse } from '@/lib/errors';


export async function POST(request: NextRequest) {
  return createAPIRoute(async ({ container, request: ctx }) => {
    const { pulseToken } = await ctx.json() as { pulseToken: string };

    if (!pulseToken) {
      return createErrorResponse(ErrorCode.INVALID_INPUT, 'Pulse token required');
    }

    const database = container.database;
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
  }, { rateLimit: { limit: 20, window: 60000 } })(request);
}
