import { NextRequest } from 'next/server';
import { handleMetricsRequest } from '@/lib/metrics';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  return handleMetricsRequest();
}
