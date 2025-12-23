import { NextRequest } from 'next/server';
import { createAPIRoute } from '@/lib/routeHelper';
import { RATE_LIMIT_QR } from '@/lib/constants';
import { validateAPIRequest } from '@/lib/apiHelpers';

export async function POST(request: NextRequest) {
  const securityError = validateAPIRequest(request, ['POST']);
  if (securityError) return securityError;

  return createAPIRoute(
    async ({ container, request: ctx, ip }) => {
      const { vaultLink } = await ctx.json();
      const { jsonResponse } = await import('@/lib/apiHandler');
      const { generateVaultQR } = await import('@/lib/qrcode');

      if (!vaultLink || typeof vaultLink !== 'string') {
        return jsonResponse({ error: 'Invalid vault link' }, 400);
      }

      // Validate URL format
      if (!vaultLink.startsWith('http://') && !vaultLink.startsWith('https://')) {
        return jsonResponse({ error: 'Vault link must be HTTP(S) URL' }, 400);
      }

      // Limit URL length to prevent huge QR codes
      if (vaultLink.length > 2048) {
        return jsonResponse({ error: 'Vault link too long' }, 400);
      }

      const qrDataUrl = await generateVaultQR(vaultLink);

      return jsonResponse({ qrCode: qrDataUrl });
    },
    { rateLimit: RATE_LIMIT_QR }
  )(request);
}
