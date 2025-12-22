export const runtime = 'edge';
import { NextRequest } from 'next/server';
import { jsonResponse } from '@/lib/apiHandler';
import { createAPIRoute } from '@/lib/routeHelper';


export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return createAPIRoute(async ({ container }) => {
    const { id: sealId } = await params;
    const auditLogger = container.auditLogger;
    const trail = await auditLogger.getAuditTrail(sealId);

    return jsonResponse({ sealId, events: trail });
  }, { rateLimit: { limit: 10, window: 60000 } })(request);
}
