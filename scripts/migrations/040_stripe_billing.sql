-- Keep legacy provider columns intact; provider IDs must never be copied to Stripe.
ALTER TABLE workspace_settings ADD COLUMN IF NOT EXISTS "stripeCustomerId" TEXT NOT NULL DEFAULT '';
ALTER TABLE workspace_settings ADD COLUMN IF NOT EXISTS "stripeSubscriptionId" TEXT NOT NULL DEFAULT '';
ALTER TABLE workspace_settings ADD COLUMN IF NOT EXISTS "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE workspace_addons ADD COLUMN IF NOT EXISTS "stripeCustomerId" TEXT NOT NULL DEFAULT '';
ALTER TABLE workspace_addons ADD COLUMN IF NOT EXISTS "stripeSubscriptionId" TEXT NOT NULL DEFAULT '';
ALTER TABLE workspace_addons ADD COLUMN IF NOT EXISTS "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT FALSE;
CREATE INDEX IF NOT EXISTS workspace_settings_stripe_customer_idx
  ON workspace_settings ("stripeCustomerId") WHERE "stripeCustomerId" <> '';
CREATE INDEX IF NOT EXISTS workspace_addons_stripe_customer_idx
  ON workspace_addons ("stripeCustomerId") WHERE "stripeCustomerId" <> '';
