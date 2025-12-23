import { NextRequest } from 'next/server';
import { jsonResponse } from '@/lib/apiHandler';
import { createAPIRoute } from '@/lib/routeHelper';
import { ErrorCode, createErrorResponse } from '@/lib/errors';
import { RATE_LIMIT_BURN } from '@/lib/constants';

export async function POST(request: NextRequest) {
  return createAPIRoute(async ({ container, request: ctx, ip }) => {
    try {
      const { pulseToken } = await ctx.json() as { pulseToken: string };

      if (!pulseToken) {
        return createErrorResponse(ErrorCode.INVALID_INPUT, 'Pulse token required');
      }

      const sealService = container.sealService;
      await sealService.burnSeal(pulseToken, ip);

      return jsonResponse({
        success: true,
        message: 'Seal burned successfully',
      });
    } catch (error) {
      console.error('[BURN] Error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return createErrorResponse(ErrorCode.INTERNAL_ERROR, `Burn failed: ${errorMessage}`);
    }
  }, { rateLimit: RATE_LIMIT_BURN })(request);
}
