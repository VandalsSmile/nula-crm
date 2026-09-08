-- Cc/Bcc recipients on outbound emails (comma-joined). Idempotent.
ALTER TABLE messages ADD COLUMN IF NOT EXISTS "cc" TEXT NOT NULL DEFAULT '';
ALTER TABLE messages ADD COLUMN IF NOT EXISTS "bcc" TEXT NOT NULL DEFAULT '';
