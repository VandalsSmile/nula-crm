-- System super-admin controls. Idempotent.
-- Suspend a customer account (blocks app access).
ALTER TABLE workspace_settings ADD COLUMN IF NOT EXISTS suspended BOOLEAN NOT NULL DEFAULT FALSE;

-- Distinguish prospect (new-account) invites from teammate invites.
ALTER TABLE team_invites ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'team';
