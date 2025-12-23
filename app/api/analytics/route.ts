import { NextRequest, NextResponse } from 'next/server';
import { createAPIRoute } from '@/lib/routeHelper';
import { AnalyticsService } from '@/lib/analytics';


const VALID_EVENT_TYPES = ['page_view', 'seal_created', 'seal_unlocked', 'pulse_received'];

export async function POST(request: NextRequest) {
  return createAPIRoute(async ({ container }) => {
    try {
      const body = await request.json();
      const { eventType, path, referrer } = body;

      // Validate event type
      if (!eventType || !VALID_EVENT_TYPES.includes(eventType)) {
        return NextResponse.json({ success: false, error: 'Invalid event type' }, { status: 400 });
      }

      // Validate path length
      if (path && path.length > 500) {
        return NextResponse.json({ success: false, error: 'Path too long' }, { status: 400 });
      }

      // Validate referrer length
      if (referrer && referrer.length > 500) {
        return NextResponse.json({ success: false, error: 'Referrer too long' }, { status: 400 });
      }

      const analytics = new AnalyticsService(container.db);
      const country = request.headers.get('cf-ipcountry') || undefined;

      await analytics.trackEvent({ eventType, path, referrer, country });
      return NextResponse.json({ success: true });
    } catch (error) {
      console.error('[Analytics API] Error:', error);
      return NextResponse.json({ success: false }, { status: 200 });
    }
  }, { rateLimit: { limit: 100, window: 60000 } })(request);
}
