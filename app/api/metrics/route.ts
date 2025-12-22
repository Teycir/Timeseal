export const runtime = 'edge';
import { NextRequest } from 'next/server';
import { handleMetricsRequest } from '@/lib/metrics';


export async function GET(request: NextRequest) {
  return handleMetricsRequest();
}
