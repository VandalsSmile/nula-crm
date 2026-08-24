-- Per-user email signatures. Idempotent.
-- Appended to every 1:1 email a user authors/sends from the CRM.
CREATE TABLE IF NOT EXISTS email_signatures (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL DEFAULT '',
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "fullName" TEXT NOT NULL DEFAULT '',
  "title" TEXT NOT NULL DEFAULT '',
  "company" TEXT NOT NULL DEFAULT '',
  "phone" TEXT NOT NULL DEFAULT '',
  "email" TEXT NOT NULL DEFAULT '',
  "website" TEXT NOT NULL DEFAULT '',
  "logoUrl" TEXT NOT NULL DEFAULT '',
  "tagline" TEXT NOT NULL DEFAULT '',
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS email_signatures_user_idx ON email_signatures ("userId");
