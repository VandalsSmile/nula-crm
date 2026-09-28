-- Ownership + visibility for target lists (groups typed 'target_list'). Idempotent.
-- Audiences stay effectively shared (default). Private lists are visible only to
-- their owner and to workspace Owners/Admins.
ALTER TABLE groups ADD COLUMN IF NOT EXISTS "ownerId" TEXT NOT NULL DEFAULT '';
ALTER TABLE groups ADD COLUMN IF NOT EXISTS "visibility" TEXT NOT NULL DEFAULT 'shared';
