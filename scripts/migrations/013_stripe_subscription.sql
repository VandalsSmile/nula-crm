-- Stripe billing: subscription state on the workspace. Idempotent.
ALTER TABLE workspace_settings ADD COLUMN IF NOT EXISTS "stripeCustomerId" TEXT NOT NULL DEFAULT '';
ALTER TABLE workspace_settings ADD COLUMN IF NOT EXISTS "stripeSubscriptionId" TEXT NOT NULL DEFAULT '';
ALTER TABLE workspace_settings ADD COLUMN IF NOT EXISTS "subscriptionStatus" TEXT NOT NULL DEFAULT '';
ALTER TABLE workspace_settings ADD COLUMN IF NOT EXISTS "priceId" TEXT NOT NULL DEFAULT '';
ALTER TABLE workspace_settings ADD COLUMN IF NOT EXISTS "currentPeriodEnd" TIMESTAMP;

-- Look up a workspace quickly from a Stripe customer id (webhook path).
CREATE INDEX IF NOT EXISTS workspace_settings_stripe_customer_idx
  ON workspace_settings ("stripeCustomerId")
  WHERE "stripeCustomerId" <> '';
