-- Industry-agnostic default + company/user profile fields. Idempotent.

-- Default new workspaces to the industry-neutral "general" type.
ALTER TABLE workspace_settings ALTER COLUMN "businessType" SET DEFAULT 'general';

-- Company profile fields.
ALTER TABLE workspace_settings ADD COLUMN IF NOT EXISTS "companyName" TEXT NOT NULL DEFAULT '';
ALTER TABLE workspace_settings ADD COLUMN IF NOT EXISTS website TEXT NOT NULL DEFAULT '';
ALTER TABLE workspace_settings ADD COLUMN IF NOT EXISTS phone TEXT NOT NULL DEFAULT '';
ALTER TABLE workspace_settings ADD COLUMN IF NOT EXISTS "supportEmail" TEXT NOT NULL DEFAULT '';
ALTER TABLE workspace_settings ADD COLUMN IF NOT EXISTS address TEXT NOT NULL DEFAULT '';
ALTER TABLE workspace_settings ADD COLUMN IF NOT EXISTS timezone TEXT NOT NULL DEFAULT 'America/New_York';

-- User profile fields.
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS phone TEXT NOT NULL DEFAULT '';
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "jobTitle" TEXT NOT NULL DEFAULT '';
