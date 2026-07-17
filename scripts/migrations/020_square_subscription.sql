-- Square billing columns (replacing Paddle). Idempotent. The old paddle* columns
-- are left in place (unused) to avoid a destructive drop; subscriptionStatus /
-- priceId / currentPeriodEnd / plan / trialEndsAt are reused as-is.
ALTER TABLE workspace_settings ADD COLUMN IF NOT EXISTS "squareCustomerId" TEXT NOT NULL DEFAULT '';
ALTER TABLE workspace_settings ADD COLUMN IF NOT EXISTS "squareSubscriptionId" TEXT NOT NULL DEFAULT '';
CREATE INDEX IF NOT EXISTS workspace_settings_square_customer_idx
  ON workspace_settings ("squareCustomerId") WHERE "squareCustomerId" <> '';
