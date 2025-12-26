import { jsonResponse } from "@/lib/apiHandler";
import { createAPIRoute } from "@/lib/routeHelper";
import { ErrorCode, createErrorResponse } from "@/lib/errors";
import { RATE_LIMIT_PULSE, MAX_PULSE_INTERVAL } from "@/lib/constants";
import { trackAnalytics } from "@/lib/apiHelpers";
import { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  console.log("[Pulse API] Request received");
  return createAPIRoute(
    async (params) => {
      const { container, request: ctx, ip } = params;
      try {
        console.log("[Pulse API] Parsing request body");
        const body = await ctx.json();
        const pulseToken = body.pulseToken;
        const newInterval = body.newInterval;
        const operationNonce = body.operationNonce;
        console.log(
          "[Pulse API] Pulse token received:",
          pulseToken ? "yes" : "no",
        );
        console.log("[Pulse API] Pulse token length:", pulseToken?.length);
        console.log(
          "[Pulse API] Pulse token parts:",
          pulseToken?.split(":").length,
        );
        console.log("[Pulse API] New interval:", newInterval);
        console.log(
          "[Pulse API] Operation nonce:",
          operationNonce ? "yes" : "no",
        );

        if (!pulseToken) {
          console.error("[Pulse API] No pulse token provided");
          return createErrorResponse(
            ErrorCode.INVALID_INPUT,
            "Pulse token required",
          );
        }

        // Validate newInterval if provided (should be in milliseconds)
        if (newInterval !== undefined) {
          const MIN_INTERVAL = 5 * 60 * 1000; // 5 minutes
          if (
            typeof newInterval !== "number" ||
            !Number.isFinite(newInterval) ||
            isNaN(newInterval) ||
            newInterval < MIN_INTERVAL ||
            newInterval > MAX_PULSE_INTERVAL
          ) {
            console.error("[Pulse API] Invalid interval:", newInterval);
            return createErrorResponse(
              ErrorCode.INVALID_INPUT,
              `Pulse interval must be between 5 minutes and 30 days`,
            );
          }
        }

        console.log("[Pulse API] Calling pulseSeal");
        const sealService = container.sealService;
        const result = await sealService.pulseSeal(
          pulseToken,
          ip,
          newInterval,
          operationNonce,
        );
        console.log(
          "[Pulse API] Pulse successful, new unlock time:",
          result.newUnlockTime,
        );

        await trackAnalytics(container.db, "pulse_received");

        return jsonResponse({
          success: true,
          newUnlockTime: result.newUnlockTime,
          newPulseToken: result.newPulseToken,
          message: "Pulse updated successfully",
        });
      } catch (error) {
        console.error("[Pulse API] Error caught:", error);
        console.error("[Pulse API] Error type:", typeof error);
        console.error(
          "[Pulse API] Error message:",
          error instanceof Error ? error.message : String(error),
        );
        console.error(
          "[Pulse API] Error stack:",
          error instanceof Error ? error.stack : "No stack",
        );
        throw error;
      }
    },
    { rateLimit: RATE_LIMIT_PULSE },
  )(request);
}
