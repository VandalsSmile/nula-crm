-- Outreach tracking on group membership, powering sales "target lists"
-- (groups with type = 'target_list'). Idempotent. Harmless on audience groups.
ALTER TABLE contact_groups ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'new';
ALTER TABLE contact_groups ADD COLUMN IF NOT EXISTS "ownerId" TEXT NOT NULL DEFAULT '';
ALTER TABLE contact_groups ADD COLUMN IF NOT EXISTS "lastTouchedAt" TIMESTAMP;
ALTER TABLE contact_groups ADD COLUMN IF NOT EXISTS "note" TEXT NOT NULL DEFAULT '';
