import { NextRequest } from "next/server";
import { jsonResponse } from "@/lib/apiHandler";
import { createAPIRoute } from "@/lib/routeHelper";
import {
  validateFileSize,
  validateUnlockTime,
  validateRequestSize,
  validateKey,
  validateTimestamp,
} from "@/lib/validation";
import { ErrorCode, createErrorResponse } from "@/lib/errors";
import { RATE_LIMIT_CREATE_SEAL } from "@/lib/constants";
import { validateAPIRequest, validateFields, trackAnalytics } from "@/lib/apiHelpers";

export async function POST(request: NextRequest) {
  const securityError = validateAPIRequest(request, ["POST"]);
  if (securityError) return securityError;

  const contentLength = parseInt(request.headers.get("content-length") || "0", 10);
  const sizeValidation = validateRequestSize(contentLength);
  if (!sizeValidation.valid) {
    return jsonResponse({ error: sizeValidation.error }, { status: 413 });
  }

  return createAPIRoute(
    async ({ container, request: ctx, ip }) => {
      const formData = await ctx.formData();
      const encryptedBlob = formData.get("encryptedBlob") as File;
      const keyB = formData.get("keyB") as string;
      const iv = formData.get("iv") as string;
      const unlockTime = parseInt(formData.get("unlockTime") as string, 10);
      const isDMS = formData.get("isDMS") === "true";
      const pulseInterval = formData.get("pulseInterval")
        ? parseInt(formData.get("pulseInterval") as string, 10)
        : undefined;
      const encryptedWebhook = formData.get("encryptedWebhook") as string | null;
      // Ephemeral seal options
      const isEphemeral = formData.get("isEphemeral") === "true";
      const maxViewsStr = formData.get("maxViews") as string | null;
      let maxViews: number | null = null;
      
      if (maxViewsStr) {
        const parsed = parseInt(maxViewsStr, 10);
        if (isNaN(parsed)) {
          return createErrorResponse(
            ErrorCode.INVALID_INPUT,
            "maxViews must be a valid number",
          );
        }
        maxViews = parsed;
      }

      if (!encryptedBlob || !keyB || !iv || !unlockTime || isNaN(unlockTime)) {
        return createErrorResponse(
          ErrorCode.INVALID_INPUT,
          "Missing required fields",
        );
      }

      // Validate all fields at once
      const validationError = validateFields([
        { validation: validateKey(keyB, "Key B") },
        { validation: validateKey(iv, "IV") },
        { validation: validateTimestamp(unlockTime) },
        { validation: validateFileSize(encryptedBlob.size) },
        { validation: validateUnlockTime(unlockTime) },
      ]);
      if (validationError) return validationError;

      const blobBuffer = await encryptedBlob.arrayBuffer();
      const result = await container.sealService.createSeal(
        {
          encryptedBlob: blobBuffer,
          keyB,
          iv,
          unlockTime,
          isDMS,
          pulseInterval,
          encryptedWebhook: encryptedWebhook || undefined,
          isEphemeral,
          maxViews,
        },
        ip,
      );

      await trackAnalytics(container.db, 'seal_created');

      return jsonResponse({
        success: true,
        sealId: result.sealId,
        iv: result.iv,
        publicUrl: `/v/${result.sealId}`,
        pulseToken: result.pulseToken,
        receipt: result.receipt,
      });
    },
    { rateLimit: RATE_LIMIT_CREATE_SEAL },
  )(request);
}
