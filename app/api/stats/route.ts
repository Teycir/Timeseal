import { NextRequest, NextResponse } from 'next/server';
import { createAPIRoute } from '@/lib/routeHelper';
import { AnalyticsService } from '@/lib/analytics';


export async function GET(request: NextRequest) {
  return createAPIRoute(async ({ container }) => {
    try {
      const analytics = new AnalyticsService(container.db);
      const totalSeals = await analytics.getTotalSealsCreated();
      return NextResponse.json({ totalSeals });
    } catch (error) {
      console.error('[Stats API] Error:', error);
      return NextResponse.json({ totalSeals: 0 }, { status: 200 });
    }
  }, { rateLimit: { limit: 100, window: 60000 } })(request);
}
