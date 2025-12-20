-- Master Key Rotation Script
-- WARNING: This script re-encrypts all Key B values with a new master key
-- Run during maintenance window only

-- Step 1: Create temporary column for new encrypted keys
ALTER TABLE seals ADD COLUMN keyb_encrypted_new TEXT;

-- Step 2: The actual re-encryption happens in the Worker script
-- See scripts/rotate-keys.ts for the re-encryption logic

-- Step 3: After re-encryption is complete, swap columns
-- ALTER TABLE seals DROP COLUMN keyb_encrypted;
-- ALTER TABLE seals RENAME COLUMN keyb_encrypted_new TO keyb_encrypted;

-- Step 4: Add rotation metadata
CREATE TABLE IF NOT EXISTS key_rotation_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  rotation_date INTEGER NOT NULL,
  seals_rotated INTEGER NOT NULL,
  previous_key_hash TEXT NOT NULL,
  new_key_hash TEXT NOT NULL
);
