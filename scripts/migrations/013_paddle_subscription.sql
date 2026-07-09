-- Paddle billing: subscription state on the workspace. Idempotent.
ALTER TABLE workspace_settings ADD COLUMN IF NOT EXISTS "paddleCustomerId" TEXT NOT NULL DEFAULT '';
ALTER TABLE workspace_settings ADD COLUMN IF NOT EXISTS "paddleSubscriptionId" TEXT NOT NULL DEFAULT '';
ALTER TABLE workspace_settings ADD COLUMN IF NOT EXISTS "subscriptionStatus" TEXT NOT NULL DEFAULT '';
ALTER TABLE workspace_settings ADD COLUMN IF NOT EXISTS "priceId" TEXT NOT NULL DEFAULT '';
ALTER TABLE workspace_settings ADD COLUMN IF NOT EXISTS "currentPeriodEnd" TIMESTAMP;

-- Look up a workspace quickly from a Paddle customer id (webhook path).
CREATE INDEX IF NOT EXISTS workspace_settings_paddle_customer_idx
  ON workspace_settings ("paddleCustomerId")
  WHERE "paddleCustomerId" <> '';
