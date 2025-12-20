import { NextRequest } from 'next/server';
import { jsonResponse } from '@/lib/apiHandler';
import { r2CircuitBreaker } from '@/lib/circuitBreaker';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  const health = {
    status: 'healthy',
    timestamp: Date.now(),
    version: '0.1.0',
    services: {
      storage: r2CircuitBreaker.getState(),
      database: 'operational',
    },
  };

  return jsonResponse(health);
}
