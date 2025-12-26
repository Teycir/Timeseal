import { jsonResponse } from "@/lib/apiHandler";
import { createAPIRoute } from "@/lib/routeHelper";
import { ErrorCode, createErrorResponse } from "@/lib/errors";
import { RATE_LIMIT_BURN } from "@/lib/constants";

import { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  console.log("[Burn API] Request received");
  return createAPIRoute(
    async (params) => {
      const { container, request: ctx, ip } = params;
      try {
        console.log("[Burn API] Parsing request body");
        const body = await ctx.json();
        const pulseToken = body.pulseToken;
        const operationNonce = body.operationNonce;
        console.log(
          "[Burn API] Pulse token received:",
          pulseToken ? "yes" : "no",
        );
        console.log(
          "[Burn API] Operation nonce:",
          operationNonce ? "yes" : "no",
        );

        if (!pulseToken) {
          console.error("[Burn API] No pulse token provided");
          return createErrorResponse(
            ErrorCode.INVALID_INPUT,
            "Pulse token required",
          );
        }

        console.log("[Burn API] Calling burnSeal");
        const sealService = container.sealService;
        await sealService.burnSeal(pulseToken, ip, operationNonce);
        console.log("[Burn API] Seal burned successfully");

        return jsonResponse({
          success: true,
          message: "Seal burned successfully",
        });
      } catch (error) {
        console.error("[Burn API] Error:", error);
        console.error("[Burn API] Error type:", typeof error);
        console.error(
          "[Burn API] Error message:",
          error instanceof Error ? error.message : String(error),
        );
        console.error(
          "[Burn API] Error stack:",
          error instanceof Error ? error.stack : "No stack",
        );
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        return createErrorResponse(
          ErrorCode.INTERNAL_ERROR,
          `Burn failed: ${errorMessage}`,
        );
      }
    },
    { rateLimit: RATE_LIMIT_BURN },
  )(request);
}
