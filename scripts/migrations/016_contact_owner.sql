-- Per-contact owner (the workspace member responsible for the relationship).
-- Stored as the owning user's id; empty string = unassigned. Idempotent.
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS "ownerId" TEXT NOT NULL DEFAULT '';
