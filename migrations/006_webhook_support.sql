-- Add webhook support (stateless, encrypted with keyB)
ALTER TABLE seals ADD COLUMN encrypted_webhook TEXT;
