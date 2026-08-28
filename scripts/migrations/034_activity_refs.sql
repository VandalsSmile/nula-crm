-- Optional reference from an activity to the underlying record it describes, so
-- the activity feed can deep-link to the right item (e.g. an email message).
-- Idempotent. refType is a small tag ("message", ...); refId is that row's id.
ALTER TABLE activities ADD COLUMN IF NOT EXISTS "refType" TEXT NOT NULL DEFAULT '';
ALTER TABLE activities ADD COLUMN IF NOT EXISTS "refId" TEXT NOT NULL DEFAULT '';
