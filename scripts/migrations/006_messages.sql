-- Unified inbox: inbound/outbound customer messages (email + SMS). Idempotent.
CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "contactId" TEXT NOT NULL,
  direction TEXT NOT NULL DEFAULT 'inbound',
  channel TEXT NOT NULL DEFAULT 'email',
  subject TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'received',
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS messages_contact_idx ON messages ("userId", "contactId", "createdAt");
