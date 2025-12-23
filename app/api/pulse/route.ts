import { NextRequest } from 'next/server';
import { jsonResponse } from '@/lib/apiHandler';
import { createAPIRoute } from '@/lib/routeHelper';
import { ErrorCode, createErrorResponse } from '@/lib/errors';
import { RATE_LIMIT_PULSE } from '@/lib/constants';
import { trackAnalytics } from '@/lib/apiHelpers';


export async function POST(request: NextRequest) {
  return createAPIRoute(async ({ container, request: ctx, ip }) => {
    const { pulseToken, newInterval } = await ctx.json() as { pulseToken: string; newInterval?: number };

    if (!pulseToken) {
      return createErrorResponse(ErrorCode.INVALID_INPUT, 'Pulse token required');
    }

    // Validate newInterval if provided
    if (newInterval !== undefined) {
      if (typeof newInterval !== 'number' || newInterval <= 0 || newInterval > 30) {
        return createErrorResponse(ErrorCode.INVALID_INPUT, 'Pulse interval must be between 1 and 30 days');
      }
    }

    const sealService = container.sealService;
    const result = await sealService.pulseSeal(pulseToken, ip, newInterval);

    await trackAnalytics(container.db, 'pulse_received');

    return jsonResponse({
      success: true,
      newUnlockTime: result.newUnlockTime,
      newPulseToken: result.newPulseToken,
      message: 'Pulse updated successfully',
    });
  }, { rateLimit: RATE_LIMIT_PULSE })(request);
}