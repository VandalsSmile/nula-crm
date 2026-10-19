import pg from "pg"
import Stripe from "stripe"

// Run inside Vercel, where protected production secrets remain available without
// downloading or printing their values. Refuse the cutover while legacy billing
// still needs reconciliation.
async function main() {
  if (process.env.VERCEL_ENV !== "production") return
  const required = [
    "DATABASE_URL", "STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET", "NEXT_PUBLIC_APP_URL",
    "STRIPE_PRICE_PRO_MONTHLY", "STRIPE_PRICE_PRO_ANNUAL",
    "STRIPE_PRICE_ADDON_B2B_INTEL_MONTHLY", "STRIPE_PRICE_ADDON_B2B_INTEL_ANNUAL",
  ]
  const missing = required.filter((name) => !process.env[name]?.trim())
  if (missing.length) throw new Error(`Missing production billing configuration: ${missing.join(", ")}`)
  if (new URL(process.env.NEXT_PUBLIC_APP_URL).origin !== "https://www.nulacrm.ai") {
    throw new Error("Unexpected production app origin")
  }
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
  try {
    const { rows: [base] } = await pool.query(`SELECT COUNT(*)::int AS count FROM workspace_settings WHERE "squareSubscriptionId" <> ''`)
    const { rows: [addons] } = await pool.query(`SELECT COUNT(*)::int AS count FROM workspace_addons WHERE "squareSubscriptionId" <> ''`)
    console.log(`Billing cutover audit: ${base.count} legacy base subscriptions, ${addons.count} legacy add-on subscriptions`)
    if (base.count || addons.count) throw new Error("Legacy subscriptions require reconciliation before Stripe cutover")
  } finally {
    await pool.end()
  }
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY.trim())
  const catalog = [
    ["STRIPE_PRICE_PRO_MONTHLY", 2900, "month"],
    ["STRIPE_PRICE_PRO_ANNUAL", 29000, "year"],
    ["STRIPE_PRICE_ADDON_B2B_INTEL_MONTHLY", 4900, "month"],
    ["STRIPE_PRICE_ADDON_B2B_INTEL_ANNUAL", 49000, "year"],
  ]
  for (const [name, amount, interval] of catalog) {
    const price = await stripe.prices.retrieve(process.env[name].trim())
    if (!price.livemode || !price.active || price.currency !== "usd" || price.unit_amount !== amount ||
        price.recurring?.interval !== interval || price.recurring.interval_count !== 1) {
      throw new Error(`Production Stripe price mismatch: ${name}`)
    }
  }
  console.log("Production Stripe price validation passed")
}
main().catch((error) => {
  // Never print database URLs, keys, or raw provider responses.
  console.error(error instanceof Error ? error.message : "Billing cutover verification failed")
  process.exitCode = 1
})
