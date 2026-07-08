-- Lead Integration module, Phase 0: sources + raw event audit/idempotency log.
-- Idempotent.
CREATE TABLE IF NOT EXISTS lead_sources (
  id TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  name TEXT NOT NULL,
  channel TEXT NOT NULL DEFAULT 'webhook',
  key TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  defaults JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS lead_sources_workspace_key_idx
  ON lead_sources ("userId", key);

CREATE TABLE IF NOT EXISTS lead_events (
  id TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "sourceId" TEXT NOT NULL DEFAULT '',
  channel TEXT NOT NULL DEFAULT 'webhook',
  "externalId" TEXT NOT NULL DEFAULT '',
  "dedupeHash" TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'received',
  "contactId" TEXT,
  error TEXT NOT NULL DEFAULT '',
  payload JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS lead_events_recent_idx ON lead_events ("userId", "createdAt");
-- Idempotency: a source's external id should only be ingested once.
CREATE UNIQUE INDEX IF NOT EXISTS lead_events_external_idx
  ON lead_events ("sourceId", "externalId")
  WHERE "externalId" <> '';
