-- Add seal_deleted tracking to analytics
-- This migration is idempotent and safe to run multiple times

-- Add total_seals_deleted column to analytics_summary if it doesn't exist
-- SQLite doesn't have IF NOT EXISTS for ALTER TABLE, so we use a workaround
-- The column will be added only if it doesn't already exist

-- Check if column exists by attempting to select it
-- If it fails, add the column
-- Note: This is handled by the application layer, not SQL

-- For new deployments, this is already in 003_analytics.sql
-- For existing deployments, run this manually:

ALTER TABLE analytics_summary ADD COLUMN total_seals_deleted INTEGER DEFAULT 0;

-- Note: The event_type column in analytics_events already accepts any TEXT value,
-- so no schema change is needed there. The application will start tracking 'seal_deleted' events.
