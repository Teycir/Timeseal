// Reusable HTTP Utilities
export interface JSONResponseOptions {
  status?: number;
  headers?: Record<string, string>;
}

export function jsonResponse(data: unknown, options: JSONResponseOptions = {}): Response {
  const { status = 200, headers = {} } = options;
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  });
}

export function errorResponse(message: string, status: number = 400): Response {
  return jsonResponse({ error: message }, { status });
}

export function successResponse(data: unknown = { success: true }): Response {
  return jsonResponse(data);
}

export async function parseJSON<T>(request: Request): Promise<T> {
  try {
    return await request.json();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Invalid JSON body: ${message}`);
  }
}

export function getClientIP(request: Request): string {
  return request.headers.get('CF-Connecting-IP') || 
         request.headers.get('X-Forwarded-For')?.split(',')[0] || 
         'unknown';
}

export function corsHeaders(origin: string = '*'): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

export function corsResponse(response: Response, origin: string = '*'): Response {
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: {
      ...Object.fromEntries(response.headers),
      ...corsHeaders(origin),
    },
  });
}

export function optionsResponse(origin: string = '*'): Response {
  return new Response(null, { headers: corsHeaders(origin) });
}
