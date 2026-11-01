-- TimeSeal Database Schema
CREATE TABLE IF NOT EXISTS seals (
  id TEXT PRIMARY KEY,
  unlock_time INTEGER NOT NULL,
  is_dms INTEGER NOT NULL,
  pulse_interval INTEGER,
  last_pulse INTEGER,
  key_b TEXT NOT NULL,
  iv TEXT NOT NULL,
  encrypted_blob TEXT,
  pulse_token TEXT,
  created_at INTEGER NOT NULL,
  blob_hash TEXT,
  unlock_message TEXT,
  expires_at INTEGER,
  access_count INTEGER DEFAULT 0,
  -- Ephemeral seal fields
  is_ephemeral INTEGER DEFAULT 0,
  max_views INTEGER DEFAULT NULL,
  view_count INTEGER DEFAULT 0,
  first_viewed_at INTEGER DEFAULT NULL,
  first_viewer_fingerprint TEXT DEFAULT NULL,
  -- Added by migrations 004_add_compression_flag / 006_webhook_support
  compressed BOOLEAN DEFAULT 0,
  encrypted_webhook TEXT
);

CREATE INDEX IF NOT EXISTS idx_seals_unlock_time ON seals(unlock_time);
CREATE INDEX IF NOT EXISTS idx_seals_pulse ON seals(pulse_interval, last_pulse);
CREATE INDEX IF NOT EXISTS idx_seals_pulse_token ON seals(pulse_token);
CREATE INDEX IF NOT EXISTS idx_seals_dms_expired ON seals(is_dms, last_pulse, pulse_interval) WHERE is_dms = 1;
CREATE INDEX IF NOT EXISTS idx_seals_ephemeral ON seals(is_ephemeral) WHERE is_ephemeral = 1;
CREATE INDEX IF NOT EXISTS idx_seals_exhausted ON seals(is_ephemeral, view_count, max_views) WHERE is_ephemeral = 1;

-- Rate limiting table
CREATE TABLE IF NOT EXISTS rate_limits (
  key TEXT PRIMARY KEY,
  count INTEGER NOT NULL DEFAULT 1,
  reset_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_reset ON rate_limits(reset_at);
CREATE INDEX IF NOT EXISTS idx_rate_limits_key ON rate_limits(key);

-- Nonce tracking for replay protection
CREATE TABLE IF NOT EXISTS nonces (
  nonce TEXT PRIMARY KEY,
  expires_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_nonces_expires ON nonces(expires_at);
CREATE INDEX IF NOT EXISTS idx_nonces_nonce ON nonces(nonce);

-- Audit log (migration 001_audit_logs)
CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp INTEGER NOT NULL,
  event_type TEXT NOT NULL,
  seal_id TEXT NOT NULL,
  ip TEXT NOT NULL,
  metadata TEXT DEFAULT '{}',
  created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000)
);

CREATE INDEX IF NOT EXISTS idx_audit_seal_id ON audit_logs(seal_id);
CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_event_type ON audit_logs(event_type);

-- Analytics (migration 003_analytics)
CREATE TABLE IF NOT EXISTS analytics_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_type TEXT NOT NULL,
  path TEXT,
  referrer TEXT,
  country TEXT,
  timestamp INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_event_type ON analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_timestamp ON analytics_events(timestamp);

CREATE TABLE IF NOT EXISTS analytics_summary (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,
  total_page_views INTEGER DEFAULT 0,
  total_seals_created INTEGER DEFAULT 0,
  total_seals_unlocked INTEGER DEFAULT 0,
  total_pulses_received INTEGER DEFAULT 0,
  total_seals_deleted INTEGER DEFAULT 0,
  unique_countries INTEGER DEFAULT 0,
  UNIQUE(date)
);
