// Cloudflare Turnstile Validation
export async function validateTurnstile(token: string, ip: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    throw new Error('TURNSTILE_SECRET_KEY not configured');
  }

  try {
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        secret,
        response: token,
        remoteip: ip,
      }),
    });

    if (!response.ok) {
      console.error('[Turnstile] Cloudflare siteverify returned HTTP', response.status);
      return false;
    }

    const data = await response.json() as {
      success: boolean;
      'error-codes'?: string[];
    };

    if (!data.success && data['error-codes']?.length) {
      console.warn('[Turnstile] Validation failed:', data['error-codes'].join(', '));
    }

    return data.success;
  } catch (error) {
    console.error('[Turnstile] Validation error:', error);
    return false;
  }
}
