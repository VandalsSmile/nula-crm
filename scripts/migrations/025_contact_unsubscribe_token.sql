-- Per-contact unsubscribe token for one-click unsubscribe links in campaign
-- emails. Opaque + unguessable; generated lazily when an email is sent.
-- Idempotent.
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS "unsubscribeToken" TEXT NOT NULL DEFAULT '';
CREATE INDEX IF NOT EXISTS contacts_unsubscribe_token_idx ON contacts ("unsubscribeToken");
