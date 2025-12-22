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
import { validateHTTPMethod, validateOrigin } from "@/lib/security";

export async function POST(request: NextRequest) {
  if (!validateHTTPMethod(request, ["POST"])) {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  if (!validateOrigin(request)) {
    return jsonResponse({ error: "Invalid origin" }, 403);
  }

  const contentLength = parseInt(request.headers.get("content-length") || "0");

  const sizeValidation = validateRequestSize(contentLength);
  if (!sizeValidation.valid) {
    return jsonResponse({ error: sizeValidation.error }, 413);
  }

  return createAPIRoute(
    async ({ container, request: ctx, ip }) => {
      const formData = await ctx.formData();
      const encryptedBlob = formData.get("encryptedBlob") as File;
      const keyB = formData.get("keyB") as string;
      const iv = formData.get("iv") as string;
      const unlockTime = parseInt(formData.get("unlockTime") as string);
      const isDMS = formData.get("isDMS") === "true";
      const pulseInterval = formData.get("pulseInterval")
        ? parseInt(formData.get("pulseInterval") as string)
        : undefined;

      if (!encryptedBlob || !keyB || !iv || !unlockTime || isNaN(unlockTime)) {
        return createErrorResponse(
          ErrorCode.INVALID_UNLOCK_TIME,
          "Missing required fields",
        );
      }

      const keyBValidation = validateKey(keyB, "Key B");
      if (!keyBValidation.valid) {
        return jsonResponse({ error: keyBValidation.error }, 400);
      }

      const ivValidation = validateKey(iv, "IV");
      if (!ivValidation.valid) {
        return jsonResponse({ error: ivValidation.error }, 400);
      }

      const timestampValidation = validateTimestamp(unlockTime);
      if (!timestampValidation.valid) {
        return jsonResponse({ error: timestampValidation.error }, 400);
      }

      const fileSizeValidation = validateFileSize(encryptedBlob.size);
      if (!fileSizeValidation.valid) {
        return jsonResponse({ error: fileSizeValidation.error }, 400);
      }

      const timeValidation = validateUnlockTime(unlockTime);
      if (!timeValidation.valid) {
        return createErrorResponse(
          ErrorCode.INVALID_UNLOCK_TIME,
          timeValidation.error,
        );
      }

      const sealService = container.sealService;
      const blobBuffer = await encryptedBlob.arrayBuffer();
      const result = await sealService.createSeal(
        {
          encryptedBlob: blobBuffer,
          keyB,
          iv,
          unlockTime,
          isDMS,
          pulseInterval,
        },
        ip,
      );

      return jsonResponse({
        success: true,
        sealId: result.sealId,
        iv: result.iv,
        publicUrl: `/v/${result.sealId}`,
        pulseToken: result.pulseToken,
        receipt: result.receipt,
      });
    },
    { rateLimit: { limit: 10, window: 60000 } },
  )(request);
}
