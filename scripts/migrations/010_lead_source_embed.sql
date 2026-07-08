-- Lead Integration module, Phase 1: web form embed config on lead_sources. Idempotent.
ALTER TABLE lead_sources ADD COLUMN IF NOT EXISTS "publicKey" TEXT NOT NULL DEFAULT '';
ALTER TABLE lead_sources ADD COLUMN IF NOT EXISTS "fieldMapping" JSONB NOT NULL DEFAULT '{}';
ALTER TABLE lead_sources ADD COLUMN IF NOT EXISTS "successMessage" TEXT NOT NULL DEFAULT '';
ALTER TABLE lead_sources ADD COLUMN IF NOT EXISTS "redirectUrl" TEXT NOT NULL DEFAULT '';

-- publicKey resolves a source (and its workspace) for public per-source endpoints.
CREATE UNIQUE INDEX IF NOT EXISTS lead_sources_public_key_idx
  ON lead_sources ("publicKey")
  WHERE "publicKey" <> '';
