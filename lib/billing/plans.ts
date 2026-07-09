/**
 * Paid plan catalog. Paddle Price IDs come from env so the same code works
 * across sandbox/production and lets you change pricing in Paddle without a
 * deploy.
 *
 * Set these after creating recurring Prices in Paddle:
 *   PADDLE_PRICE_PRO_MONTHLY, PADDLE_PRICE_PRO_ANNUAL   (pri_...)
 */
export type BillingInterval = "month" | "year"

export type Plan = {
  id: string
  name: string
  interval: BillingInterval
  priceId: string
  amount: number // in cents, for display
  currency: string
  blurb: string
}

export const PLAN_FEATURES = [
  "Unlimited contacts, tags, and groups",
  "AI command bar, lead scoring & summaries",
  "Campaigns, automations, and reports",
  "All lead sources: web forms, email, calls, webhooks",
  "Team access with roles",
]

export const PLANS: Plan[] = [
  {
    id: "pro-monthly",
    name: "Nula Pro",
    interval: "month",
    priceId: process.env.PADDLE_PRICE_PRO_MONTHLY?.trim() ?? "",
    amount: 2900,
    currency: "usd",
    blurb: "Billed monthly",
  },
  {
    id: "pro-annual",
    name: "Nula Pro",
    interval: "year",
    priceId: process.env.PADDLE_PRICE_PRO_ANNUAL?.trim() ?? "",
    amount: 29000,
    currency: "usd",
    blurb: "Billed annually — save ~17%",
  },
]

export function planById(id: string): Plan | undefined {
  return PLANS.find((p) => p.id === id)
}

export function planByPriceId(priceId: string): Plan | undefined {
  if (!priceId) return undefined
  return PLANS.find((p) => p.priceId === priceId)
}

/** Plans that have a Paddle Price ID configured (i.e. are purchasable). */
export function availablePlans(): Plan[] {
  return PLANS.filter((p) => p.priceId)
}

export function formatPrice(amount: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: amount % 100 === 0 ? 0 : 2,
  }).format(amount / 100)
}
