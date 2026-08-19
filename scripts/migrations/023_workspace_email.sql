-- Per-account Resend email sending config. Each workspace can connect its own
-- Resend API key + verified From address so campaign emails send from their own
-- domain. When unset, sending falls back to the platform's RESEND_* env vars.
-- Idempotent.
ALTER TABLE workspace_settings ADD COLUMN IF NOT EXISTS "resendApiKey" TEXT NOT NULL DEFAULT '';
ALTER TABLE workspace_settings ADD COLUMN IF NOT EXISTS "resendFromEmail" TEXT NOT NULL DEFAULT '';
ALTER TABLE workspace_settings ADD COLUMN IF NOT EXISTS "resendFromName" TEXT NOT NULL DEFAULT '';
