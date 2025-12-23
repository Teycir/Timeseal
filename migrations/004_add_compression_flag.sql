-- Add compression flag to seals table
-- Migration: 004_add_compression_flag.sql

ALTER TABLE seals ADD COLUMN compressed BOOLEAN DEFAULT 0;

-- Index for analytics (optional)
CREATE INDEX IF NOT EXISTS idx_seals_compressed ON seals(compressed);
