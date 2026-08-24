-- Email threading + reply routing. Idempotent.
-- Adds thread/header columns to messages and a reply-route table that maps a
-- per-contact Reply-To token (reply+{token}@inbox…) back to its workspace/contact.

ALTER TABLE messages ADD COLUMN IF NOT EXISTS "messageId" TEXT NOT NULL DEFAULT '';
ALTER TABLE messages ADD COLUMN IF NOT EXISTS "inReplyTo" TEXT NOT NULL DEFAULT '';
ALTER TABLE messages ADD COLUMN IF NOT EXISTS "referencesHeader" TEXT NOT NULL DEFAULT '';
ALTER TABLE messages ADD COLUMN IF NOT EXISTS "threadId" TEXT NOT NULL DEFAULT '';
CREATE INDEX IF NOT EXISTS messages_thread_idx ON messages ("threadId") WHERE "threadId" <> '';

CREATE TABLE IF NOT EXISTS message_routes (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,        -- workspace id
  "contactId" TEXT NOT NULL,
  "token" TEXT NOT NULL,         -- embedded in reply+{token}@inbox…
  "threadId" TEXT NOT NULL DEFAULT '',
  "createdBy" TEXT NOT NULL DEFAULT '',
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS message_routes_token_idx ON message_routes ("token");
CREATE INDEX IF NOT EXISTS message_routes_ws_contact_idx ON message_routes ("userId", "contactId");
