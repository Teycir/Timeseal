import { NextRequest } from 'next/server';
import { jsonResponse } from '@/lib/apiHandler';
import { createAPIRoute } from '@/lib/routeHelper';
import { ErrorCode, createErrorResponse } from '@/lib/errors';
import { RATE_LIMIT_PULSE } from '@/lib/constants';
import { handleAPIError } from '@/lib/errorHandler';

export async function POST(request: NextRequest) {
  return createAPIRoute(async ({ container, request: ctx, ip }) => {
    try {
      const { pulseToken } = await ctx.json() as { pulseToken: string };

      if (!pulseToken) {
        return createErrorResponse(ErrorCode.INVALID_INPUT, 'Pulse token required');
      }

      const sealService = container.sealService;
      await sealService.unlockSeal(pulseToken, ip);

      return jsonResponse({
        success: true,
        message: 'Seal unlocked immediately',
      });
    } catch (error) {
      return handleAPIError(error, {
        component: 'unlock',
        action: 'POST /api/unlock',
        ip,
      });
    }
  }, { rateLimit: RATE_LIMIT_PULSE })(request);
}
