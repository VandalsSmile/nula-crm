import "server-only"

import Stripe from "stripe"

let cached: Stripe | null = null

/** Whether Stripe billing is configured for this environment. */
export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY?.trim())
}

/** Lazily-constructed Stripe client. Throws a clear error when unconfigured. */
export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY?.trim()
  if (!key) {
    throw new Error("Billing isn't set up yet. Add STRIPE_SECRET_KEY to enable payments.")
  }
  if (!cached) {
    cached = new Stripe(key, { appInfo: { name: "Nula CRM" } })
  }
  return cached
}
