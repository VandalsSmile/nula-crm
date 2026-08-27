-- Track whether a signature logo's stored image has been physically resized to
-- the small email footprint (not just constrained via CSS/attributes). Idempotent.
-- Existing rows default to false so their logos get re-normalized on next use,
-- which shrinks the actual file — the reliable fix for clients that ignore the
-- width/height attributes and would otherwise render the original at full size.
ALTER TABLE email_signatures ADD COLUMN IF NOT EXISTS "logoNormalized" BOOLEAN NOT NULL DEFAULT false;
