-- Workspace company logo (Vercel Blob URL) shown in the sidebar. Idempotent.
ALTER TABLE workspace_settings ADD COLUMN IF NOT EXISTS "logoUrl" TEXT NOT NULL DEFAULT '';
