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
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_seals_unlock_time ON seals(unlock_time);
CREATE INDEX IF NOT EXISTS idx_seals_pulse ON seals(pulse_interval, last_pulse);
