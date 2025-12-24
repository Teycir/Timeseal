import { NextRequest } from 'next/server';
import { jsonResponse } from '@/lib/apiHandler';
import { createAPIRoute } from '@/lib/routeHelper';

export async function POST(request: NextRequest) {
  return createAPIRoute(async ({ container }) => {
    const body = await request.json() as { receipt: any };
    const { receipt } = body;

    if (!receipt?.sealId || !receipt?.blobHash || !receipt?.signature) {
      return jsonResponse({ valid: false, error: 'Invalid receipt format' }, { status: 400 });
    }

    const data = `${receipt.sealId}:${receipt.blobHash}:${receipt.unlockTime}:${receipt.createdAt}`;
    const encoder = new TextEncoder();
    
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(container.masterKey),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );
    
    const sigMatch = receipt.signature.match(/.{1,2}/g);
    if (!sigMatch) {
      return jsonResponse({ valid: false, error: 'Invalid signature format' }, { status: 400 });
    }
    
    const sigBytes = new Uint8Array(sigMatch.map((byte: string) => parseInt(byte, 16)));
    const valid = await crypto.subtle.verify('HMAC', key, sigBytes, encoder.encode(data));

    return jsonResponse({ valid, sealId: receipt.sealId });
  })(request);
}
