import { jsonResponse } from "@/lib/apiHandler";
import { createAPIRoute } from "@/lib/routeHelper";
import { ErrorCode, createErrorResponse } from "@/lib/errors";
import { RATE_LIMIT_PULSE } from "@/lib/constants";
import { handleAPIError } from "@/lib/errorHandler";

export async function POST(request: any) {
  console.log("[Unlock API] Request received");
  return createAPIRoute(
    async (params) => {
      const { container, request: ctx, ip } = params;
      try {
        console.log("[Unlock API] Parsing request body");
        const body = await ctx.json();
        const pulseToken = body.pulseToken;
        const operationNonce = body.operationNonce;
        console.log(
          "[Unlock API] Pulse token received:",
          pulseToken ? "yes" : "no",
        );
        console.log("[Unlock API] Pulse token length:", pulseToken?.length);
        console.log(
          "[Unlock API] Pulse token parts:",
          pulseToken?.split(":").length,
        );
        console.log(
          "[Unlock API] Operation nonce:",
          operationNonce ? "yes" : "no",
        );

        if (!pulseToken) {
          console.error("[Unlock API] No pulse token provided");
          return createErrorResponse(
            ErrorCode.INVALID_INPUT,
            "Pulse token required",
          );
        }

        console.log("[Unlock API] Calling unlockSeal");
        const sealService = container.sealService;
        await sealService.unlockSeal(pulseToken, ip, operationNonce);
        console.log("[Unlock API] Seal unlocked successfully");

        return jsonResponse({
          success: true,
          message: "Seal unlocked immediately",
        });
      } catch (error) {
        console.error("[Unlock API] Error:", error);
        console.error("[Unlock API] Error type:", typeof error);
        console.error(
          "[Unlock API] Error message:",
          error instanceof Error ? error.message : String(error),
        );
        console.error(
          "[Unlock API] Error stack:",
          error instanceof Error ? error.stack : "No stack",
        );
        return handleAPIError(error, {
          component: "unlock",
          action: "POST /api/unlock",
          ip,
        });
      }
    },
    { rateLimit: RATE_LIMIT_PULSE },
  )(request);
}
