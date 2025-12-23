import { NextRequest } from 'next/server';
import { createAPIRoute } from '@/lib/routeHelper';
import { jsonResponse } from '@/lib/apiHandler';


export async function GET(request: NextRequest) {
  return createAPIRoute(async ({ container }) => {
    try {
      const result = await container.db.prepare(`
        SELECT 
          event_type,
          country,
          timestamp
        FROM analytics
        WHERE event_type IN ('seal_created', 'seal_unlocked', 'pulse_received')
        ORDER BY timestamp DESC
        LIMIT 20
      `).all();

      const activities = result.results.map((row: any) => ({
        type: row.event_type === 'seal_created' ? 'sealed' : 
              row.event_type === 'seal_unlocked' ? 'unlocked' : 'dms',
        location: row.country || undefined,
        timestamp: row.timestamp,
      }));

      return jsonResponse({ activities });
    } catch (error) {
      console.error('[Activity] Error:', error);
      return jsonResponse({ activities: [] });
    }
  }, { rateLimit: { limit: 30, window: 60000 } })(request);
}
