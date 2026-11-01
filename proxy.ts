import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  // Force HTTPS redirect (skip localhost so local dev and Playwright can probe http://localhost:3000)
  const host = request.nextUrl.hostname;
  const isLocal = host === 'localhost' || host === '127.0.0.1' || host === '::1' || host === '[::1]';
  if (request.nextUrl.protocol === 'http:' && !isLocal) {
    const httpsUrl = request.nextUrl.clone();
    httpsUrl.protocol = 'https:';
    return NextResponse.redirect(httpsUrl, 301);
  }

  const response = NextResponse.next();

  // Cache-busting headers
  response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
  response.headers.set('Pragma', 'no-cache');
  response.headers.set('Expires', '0');

  // CSP is set via Cloudflare Transform Rules

  return response;
}

export const config = {
  // Skip static assets: they are content-hashed and must stay cacheable.
  matcher: '/((?!_next/static|_next/image|favicon.ico).*)',
};
