-- Add encrypted_blob column for D1 storage
ALTER TABLE seals ADD COLUMN encrypted_blob TEXT;
