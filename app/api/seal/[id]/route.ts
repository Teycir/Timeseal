export const runtime = 'edge';
import { NextRequest } from 'next/server';
import { jsonResponse } from '@/lib/apiHandler';
import { createAPIRoute } from '@/lib/routeHelper';


export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return createAPIRoute(async ({ container, ip }) => {
    const { id: sealId } = await params;
    const sealService = container.sealService;
    const metadata = await sealService.getSeal(sealId, ip);

    if (metadata.status === 'locked') {
      return jsonResponse({
        id: sealId,
        isLocked: true,
        unlockTime: metadata.unlockTime,
        timeRemaining: metadata.unlockTime - Date.now(),
      });
    }

    const blob = await sealService.getBlob(sealId);
    const bytes = new Uint8Array(blob);
    const blobBase64 = btoa(String.fromCharCode(...bytes));

    return jsonResponse({
      id: sealId,
      isLocked: false,
      unlockTime: metadata.unlockTime,
      keyB: metadata.keyB,
      iv: metadata.iv,
      encryptedBlob: blobBase64,
    });
  }, { rateLimit: { limit: 20, window: 60000 } })(request);
}
