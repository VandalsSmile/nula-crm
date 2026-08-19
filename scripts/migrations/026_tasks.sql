-- Tasks: follow-ups and to-dos, optionally linked to a contact and assigned to
-- a teammate. Idempotent.
CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  title TEXT NOT NULL,
  notes TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'open',
  priority TEXT NOT NULL DEFAULT 'normal',
  "dueAt" TIMESTAMP,
  "contactId" TEXT NOT NULL DEFAULT '',
  "assigneeId" TEXT NOT NULL DEFAULT '',
  "createdBy" TEXT NOT NULL DEFAULT '',
  "completedAt" TIMESTAMP,
  "remindedAt" TIMESTAMP,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS tasks_user_idx ON tasks ("userId");
CREATE INDEX IF NOT EXISTS tasks_due_idx ON tasks ("dueAt");
CREATE INDEX IF NOT EXISTS tasks_contact_idx ON tasks ("contactId");
