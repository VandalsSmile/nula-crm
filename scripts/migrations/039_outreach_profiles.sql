-- Outreach Advisor: per-workspace cold-outreach playbook (part of the upgraded
-- intelligence package). One active profile per workspace; body stored as JSONB
-- so the schema can evolve (signals/approaches/verticals/formula) without further
-- migrations. Idempotent.
CREATE TABLE IF NOT EXISTS outreach_profiles (
  id          TEXT PRIMARY KEY,
  "userId"    TEXT NOT NULL,
  name        TEXT NOT NULL DEFAULT 'Outreach playbook',
  "isActive"  BOOLEAN NOT NULL DEFAULT true,
  data        JSONB NOT NULL DEFAULT '{}'::jsonb,
  "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS outreach_profiles_user_idx ON outreach_profiles ("userId");
