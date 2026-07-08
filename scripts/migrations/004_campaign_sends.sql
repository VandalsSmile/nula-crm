-- Per-recipient, per-step campaign delivery tracking so multi-step sequences
-- can be scheduled and sent over time (idempotent).
CREATE TABLE IF NOT EXISTS campaign_sends (
  id TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "campaignId" TEXT NOT NULL,
  "contactId" TEXT NOT NULL,
  step INTEGER NOT NULL DEFAULT 1,
  channel TEXT NOT NULL DEFAULT 'email',
  status TEXT NOT NULL DEFAULT 'scheduled',
  "scheduledFor" TIMESTAMP NOT NULL DEFAULT NOW(),
  "sentAt" TIMESTAMP,
  error TEXT NOT NULL DEFAULT '',
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS campaign_sends_unique_idx
  ON campaign_sends ("campaignId", "contactId", step);

CREATE INDEX IF NOT EXISTS campaign_sends_due_idx
  ON campaign_sends (status, "scheduledFor");
