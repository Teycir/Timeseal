// Privacy-First Analytics Service
// Tracks aggregate metrics without personal data

import type { D1Database } from '@cloudflare/workers-types';

export interface AnalyticsEvent {
  eventType: 'page_view' | 'seal_created' | 'seal_unlocked' | 'pulse_received' | 'seal_deleted';
  path?: string;
  referrer?: string;
  country?: string;
}

export interface AnalyticsSummary {
  date: string;
  totalPageViews: number;
  totalSealsCreated: number;
  totalSealsUnlocked: number;
  totalPulsesReceived: number;
  totalSealsDeleted: number;
  uniqueCountries: number;
}

export class AnalyticsService {
  constructor(private db: D1Database) {}

  async trackEvent(event: AnalyticsEvent): Promise<void> {
    try {
      await this.db
        .prepare(
          'INSERT INTO analytics_events (event_type, path, referrer, country, timestamp) VALUES (?, ?, ?, ?, ?)'
        )
        .bind(
          event.eventType,
          event.path || null,
          event.referrer || null,
          event.country || null,
          Date.now()
        )
        .run();
    } catch (error) {
      // Silent fail - analytics should never break the app
      console.error('[Analytics] Track failed:', error);
    }
  }

  async getSummary(days: number = 30): Promise<AnalyticsSummary[]> {
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    
    const result = await this.db
      .prepare(
        `SELECT 
          date(timestamp / 1000, 'unixepoch') as date,
          COUNT(CASE WHEN event_type = 'page_view' THEN 1 END) as totalPageViews,
          COUNT(CASE WHEN event_type = 'seal_created' THEN 1 END) as totalSealsCreated,
          COUNT(CASE WHEN event_type = 'seal_unlocked' THEN 1 END) as totalSealsUnlocked,
          COUNT(CASE WHEN event_type = 'pulse_received' THEN 1 END) as totalPulsesReceived,
          COUNT(CASE WHEN event_type = 'seal_deleted' THEN 1 END) as totalSealsDeleted,
          COUNT(DISTINCT country) as uniqueCountries
        FROM analytics_events
        WHERE timestamp >= ?
        GROUP BY date
        ORDER BY date DESC`
      )
      .bind(cutoff)
      .all();

    return result.results as unknown as AnalyticsSummary[];
  }

  async getTotalSealsCreated(): Promise<number> {
    const created = await this.db
      .prepare('SELECT COUNT(*) as count FROM analytics_events WHERE event_type = ?')
      .bind('seal_created')
      .first<{ count: number }>();
    
    const deleted = await this.db
      .prepare('SELECT COUNT(*) as count FROM analytics_events WHERE event_type = ?')
      .bind('seal_deleted')
      .first<{ count: number }>();
    
    return (created?.count || 0) - (deleted?.count || 0);
  }
}
