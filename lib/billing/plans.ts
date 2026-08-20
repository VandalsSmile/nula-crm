/**
 * Paid plan catalog. Square subscription plan *variation* IDs come from env so
 * the same code works across sandbox/production and lets you change pricing in
 * Square without a deploy.
 *
 * Set these to the subscription plan VARIATION ids (not the plan id) created in
 * the Square Dashboard/Catalog:
 *   SQUARE_PLAN_PRO_MONTHLY, SQUARE_PLAN_PRO_ANNUAL
 */
export type BillingInterval = "month" | "year"

export type Plan = {
  id: string
  name: string
  interval: BillingInterval
  /** Square subscription plan variation id. */
  priceId: string
  amount: number // in cents, charged + displayed
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
    priceId: process.env.SQUARE_PLAN_PRO_MONTHLY?.trim() ?? "",
    amount: 2900,
    currency: "usd",
    blurb: "Billed monthly",
  },
  {
    id: "pro-annual",
    name: "Nula Pro",
    interval: "year",
    priceId: process.env.SQUARE_PLAN_PRO_ANNUAL?.trim() ?? "",
    amount: 29000,
    currency: "usd",
    blurb: "Billed annually — save ~17%",
  },
]

/**
 * Paid add-on modules — a second, independent subscription on top of the base
 * plan. Square plan *variation* ids come from env:
 *   SQUARE_PLAN_ADDON_B2B_INTEL_MONTHLY, SQUARE_PLAN_ADDON_B2B_INTEL_ANNUAL
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
    priceId: process.env.SQUARE_PLAN_ADDON_B2B_INTEL_MONTHLY?.trim() ?? "",
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
    priceId: process.env.SQUARE_PLAN_ADDON_B2B_INTEL_ANNUAL?.trim() ?? "",
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

/** Add-ons for a given module that have a Square variation configured. */
export function availableAddons(addonId: string): Addon[] {
  return ADDONS.filter((a) => a.addonId === addonId && a.priceId)
}

/** Plans that have a Square plan variation id configured (i.e. are purchasable). */
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
