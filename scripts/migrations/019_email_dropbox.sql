-- Per-user email "dropbox" address so users can BCC/forward mail into the CRM
-- and have it logged against the matching contact. Idempotent.
CREATE TABLE IF NOT EXISTS email_connections (
  id text PRIMARY KEY,
  "userId" text NOT NULL,
  "workspaceId" text NOT NULL,
  token text NOT NULL,
  "ownedEmails" text NOT NULL DEFAULT '',
  mode text NOT NULL DEFAULT 'contacts_only',
  "createdAt" timestamp NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS email_connections_token_idx ON email_connections (token);
CREATE UNIQUE INDEX IF NOT EXISTS email_connections_user_idx ON email_connections ("userId");

-- Message provenance for logged emails: dedupe key + parsed from/to addresses.
ALTER TABLE messages ADD COLUMN IF NOT EXISTS "externalId" TEXT NOT NULL DEFAULT '';
ALTER TABLE messages ADD COLUMN IF NOT EXISTS "fromEmail" TEXT NOT NULL DEFAULT '';
ALTER TABLE messages ADD COLUMN IF NOT EXISTS "toEmail" TEXT NOT NULL DEFAULT '';
CREATE INDEX IF NOT EXISTS messages_external_id_idx ON messages ("userId", "externalId");
