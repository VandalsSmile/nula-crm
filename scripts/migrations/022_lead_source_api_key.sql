-- Simple per-account API key for posting leads (Zapier, etc.). Optional: only
-- enforced when requireKey is on; the endpoint is open (URL-only) by default for
-- quick setup. Idempotent.
ALTER TABLE lead_sources ADD COLUMN IF NOT EXISTS "apiKey" TEXT NOT NULL DEFAULT '';
ALTER TABLE lead_sources ADD COLUMN IF NOT EXISTS "requireKey" BOOLEAN NOT NULL DEFAULT false;
