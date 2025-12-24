-- Analytics Tables (Privacy-First)
-- Tracks aggregate metrics without personal data

CREATE TABLE IF NOT EXISTS analytics_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_type TEXT NOT NULL, -- 'page_view', 'seal_created', 'seal_unlocked', 'pulse_received', 'seal_deleted'
  path TEXT, -- '/v/[id]', '/pulse/[token]', etc.
  referrer TEXT,
  country TEXT, -- From CF headers
  timestamp INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_event_type ON analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_timestamp ON analytics_events(timestamp);

CREATE TABLE IF NOT EXISTS analytics_summary (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL, -- YYYY-MM-DD
  total_page_views INTEGER DEFAULT 0,
  total_seals_created INTEGER DEFAULT 0,
  total_seals_unlocked INTEGER DEFAULT 0,
  total_pulses_received INTEGER DEFAULT 0,
  total_seals_deleted INTEGER DEFAULT 0,
  unique_countries INTEGER DEFAULT 0,
  UNIQUE(date)
);
