-- Lead Integration module, Phase 5: signing secret for webhook sources. Idempotent.
ALTER TABLE lead_sources ADD COLUMN IF NOT EXISTS secret TEXT NOT NULL DEFAULT '';
