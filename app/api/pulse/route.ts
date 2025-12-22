import { NextRequest } from 'next/server';
import { jsonResponse } from '@/lib/apiHandler';
import { createAPIRoute } from '@/lib/routeHelper';
import { ErrorCode, createErrorResponse } from '@/lib/errors';


export async function POST(request: NextRequest) {
  return createAPIRoute(async ({ container, request: ctx, ip }) => {
    const { pulseToken, newInterval } = await ctx.json() as { pulseToken: string; newInterval?: number };

    if (!pulseToken) {
      return createErrorResponse(ErrorCode.INVALID_INPUT, 'Pulse token required');
    }

    const sealService = container.sealService;
    const result = await sealService.pulseSeal(pulseToken, ip, newInterval);

    return jsonResponse({
      success: true,
      newUnlockTime: result.newUnlockTime,
      message: 'Pulse updated successfully',
    });
  }, { rateLimit: { limit: 20, window: 60000 } })(request);
}