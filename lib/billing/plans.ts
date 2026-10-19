/** Recurring Stripe Price IDs come from environment configuration. */
export type BillingInterval = "month" | "year"

export type Plan = {
  id: string
  name: string
  interval: BillingInterval
  /** Stripe recurring Price ID. */
  priceId: string
  amount: number // in cents, displayed; Stripe Price is validated before checkout
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
    priceId: process.env.STRIPE_PRICE_PRO_MONTHLY?.trim() ?? "",
    amount: 2900,
    currency: "usd",
    blurb: "Billed monthly",
  },
  {
    id: "pro-annual",
    name: "Nula Pro",
    interval: "year",
    priceId: process.env.STRIPE_PRICE_PRO_ANNUAL?.trim() ?? "",
    amount: 29000,
    currency: "usd",
    blurb: "Billed annually — save ~17%",
  },
]

/**
 * Paid add-on modules — a second, independent subscription on top of the base
 * plan. Stripe recurring Price IDs come from env:
 *   STRIPE_PRICE_ADDON_B2B_INTEL_MONTHLY, STRIPE_PRICE_ADDON_B2B_INTEL_ANNUAL
 */
export type Addon = Plan & {
  /** The module this subscription unlocks (see lib/modules.ts). */
  addonId: string
  /** Monthly enrichment credit allowance granted by this add-on. */
  creditLimit: number
}

export const B2B_INTELLIGENCE_FEATURES = [
  "One-click Enrich on any contact or company",
  "Auto-filled industry, size, revenue, title & seniority",
  "A Nula Fit Score (0–100) on every prospect",
  "Plain-English AI summary + recommended next step",
  "Smart tags that power AI segments (e.g. “healthcare decision makers”)",
  "250 enrichments/month included",
]

export const ADDONS: Addon[] = [
  {
    id: "b2b-intelligence-monthly",
    addonId: "b2b_intelligence",
    name: "B2B Intelligence",
    interval: "month",
    priceId: process.env.STRIPE_PRICE_ADDON_B2B_INTEL_MONTHLY?.trim() ?? "",
    amount: 4900,
    currency: "usd",
    blurb: "Billed monthly, on top of your plan",
    creditLimit: 250,
  },
  {
    id: "b2b-intelligence-annual",
    addonId: "b2b_intelligence",
    name: "B2B Intelligence",
    interval: "year",
    priceId: process.env.STRIPE_PRICE_ADDON_B2B_INTEL_ANNUAL?.trim() ?? "",
    amount: 49000,
    currency: "usd",
    blurb: "Billed annually — save ~17%",
    creditLimit: 250,
  },
]

export function planById(id: string): Plan | undefined {
  return PLANS.find((p) => p.id === id)
}

export function planByPriceId(priceId: string): Plan | undefined {
  if (!priceId) return undefined
  return PLANS.find((p) => p.priceId === priceId)
}

export function addonById(id: string): Addon | undefined {
  return ADDONS.find((a) => a.id === id)
}

export function addonByPriceId(priceId: string): Addon | undefined {
  if (!priceId) return undefined
  return ADDONS.find((a) => a.priceId === priceId)
}

/** Add-ons for a given module that have a Stripe Price configured. */
export function availableAddons(addonId: string): Addon[] {
  return ADDONS.filter((a) => a.addonId === addonId && a.priceId)
}

/** Plans that have a Stripe Price ID configured (i.e. are purchasable). */
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
