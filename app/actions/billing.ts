"use server"

import { eq } from "drizzle-orm"
import { headers } from "next/headers"

import { getActingUser, requireOwner } from "@/lib/auth-helpers"
import { db } from "@/lib/db"
import { workspaceAddons, workspaceSettings } from "@/lib/db/schema"
import { isBillingManager } from "@/lib/roles"
import {
  cancelSquareSubscription,
  createSubscriptionPaymentLink,
  isBillingConfigured,
  resolvePlanVariationId,
} from "@/lib/square"
import {
  addonById,
  availableAddons,
  availablePlans,
  formatPrice,
  planById,
  planByPriceId,
} from "@/lib/billing/plans"
import { getModuleState, MODULE_IDS, type ModuleState } from "@/lib/modules"
import { clearAddonSubscription, enableAddonLocally } from "@/lib/billing/addons"
import { and } from "drizzle-orm"

export type PlanOption = {
  id: string
  name: string
  interval: string
  priceId: string
  priceLabel: string
  blurb: string
}

export type BillingState = {
  configured: boolean
  canManage: boolean
  workspaceId: string
  customerEmail: string
  plan: string
  subscriptionStatus: string
  currentPeriodEnd: string | null
  currentPlanName: string | null
  currentInterval: string | null
  hasActiveSubscription: boolean
  plans: PlanOption[]
}

export async function getBillingState(): Promise<BillingState> {
  const { user, workspaceId, role } = await getActingUser()
  const [row] = await db
    .select({
      plan: workspaceSettings.plan,
      subscriptionStatus: workspaceSettings.subscriptionStatus,
      currentPeriodEnd: workspaceSettings.currentPeriodEnd,
      priceId: workspaceSettings.priceId,
      squareSubscriptionId: workspaceSettings.squareSubscriptionId,
    })
    .from(workspaceSettings)
    .where(eq(workspaceSettings.workspaceId, workspaceId))
    .limit(1)

  const current = row?.priceId ? planByPriceId(row.priceId) : undefined
  const hasActiveSubscription =
    Boolean(row?.squareSubscriptionId) &&
    ["active", "pending", "paused", "past_due"].includes(row?.subscriptionStatus ?? "")

  return {
    configured: isBillingConfigured(),
    canManage: isBillingManager(role),
    workspaceId,
    customerEmail: user.email,
    plan: row?.plan ?? "trial",
    subscriptionStatus: row?.subscriptionStatus ?? "",
    currentPeriodEnd: row?.currentPeriodEnd?.toISOString() ?? null,
    currentPlanName: current?.name ?? null,
    currentInterval: current?.interval ?? null,
    hasActiveSubscription,
    plans: availablePlans().map((p) => ({
      id: p.id,
      name: p.name,
      interval: p.interval,
      priceId: p.priceId,
      priceLabel: `${formatPrice(p.amount, p.currency)}/${p.interval === "year" ? "yr" : "mo"}`,
      blurb: p.blurb,
    })),
  }
}

function appOrigin(h: Headers): string {
  const explicit = process.env.NEXT_PUBLIC_APP_URL?.trim() || process.env.BETTER_AUTH_URL?.trim()
  if (explicit) return explicit.replace(/\/$/, "")
  const proto = h.get("x-forwarded-proto") ?? "https"
  const host = h.get("x-forwarded-host") ?? h.get("host")
  return `${proto}://${host}`
}

/**
 * Create a Square-hosted checkout for a plan. Owner-only. Returns the URL on
 * success or a human-readable error (returned as data so it survives to the
 * client, unlike a thrown server-action error which prod redacts).
 */
export async function createCheckout(planId: string): Promise<{ url?: string; error?: string }> {
  const { user } = await requireOwner()
  if (!isBillingConfigured()) return { error: "Billing isn't set up yet." }

  const plan = planById(planId)
  if (!plan || !plan.priceId) return { error: "That plan isn't available." }

  try {
    const origin = appOrigin(await headers())
    // Accept either a plan variation id or a plan id in config; resolve to the
    // variation id the Checkout API requires.
    const planVariationId = await resolvePlanVariationId(plan.priceId, plan.interval)
    const { url } = await createSubscriptionPaymentLink({
      planVariationId,
      amountCents: plan.amount,
      planName: `${plan.name} (${plan.interval === "year" ? "annual" : "monthly"})`,
      buyerEmail: user.email,
      redirectUrl: `${origin}/app/settings?tab=plan&checkout=success`,
    })
    return { url }
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not start checkout" }
  }
}

// ── B2B Intelligence add-on (a second subscription, independent of base plan) ──

export type AddonState = {
  module: ModuleState
  companyModel: string
  configured: boolean
  canManage: boolean
  plans: PlanOption[]
}

/** Add-on state for the Plan tab: module status, promotion hint, and purchasable add-ons. */
export async function getAddonState(): Promise<AddonState> {
  const { workspaceId, role } = await getActingUser()
  const [row] = await db
    .select({ companyModel: workspaceSettings.companyModel })
    .from(workspaceSettings)
    .where(eq(workspaceSettings.workspaceId, workspaceId))
    .limit(1)

  return {
    module: await getModuleState(MODULE_IDS.b2bIntelligence),
    companyModel: row?.companyModel ?? "",
    configured: isBillingConfigured(),
    canManage: isBillingManager(role),
    plans: availableAddons(MODULE_IDS.b2bIntelligence).map((a) => ({
      id: a.id,
      name: a.name,
      interval: a.interval,
      priceId: a.priceId,
      priceLabel: `${formatPrice(a.amount, a.currency)}/${a.interval === "year" ? "yr" : "mo"}`,
      blurb: a.blurb,
    })),
  }
}

/** Start Square checkout for an add-on subscription. Owner-only. */
export async function createAddonCheckout(planId: string): Promise<{ url?: string; error?: string }> {
  const { user } = await requireOwner()
  if (!isBillingConfigured()) return { error: "Billing isn't set up yet." }

  const addon = addonById(planId)
  if (!addon || !addon.priceId) return { error: "That add-on isn't available." }

  try {
    const origin = appOrigin(await headers())
    const planVariationId = await resolvePlanVariationId(addon.priceId, addon.interval)
    const { url } = await createSubscriptionPaymentLink({
      planVariationId,
      amountCents: addon.amount,
      planName: `${addon.name} (${addon.interval === "year" ? "annual" : "monthly"})`,
      buyerEmail: user.email,
      redirectUrl: `${origin}/app/settings?tab=plan&addon=${addon.addonId}&checkout=success`,
    })
    return { url }
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not start checkout" }
  }
}

/**
 * Dev/no-Square fallback: enable the add-on immediately. When Square is
 * configured, callers must go through checkout instead.
 */
export async function enableAddonNow(): Promise<{ ok: true }> {
  const { user, workspaceId } = await requireOwner()
  if (isBillingConfigured()) {
    throw new Error("Please subscribe through checkout to enable this add-on.")
  }
  await enableAddonLocally(workspaceId, MODULE_IDS.b2bIntelligence, user.id)
  return { ok: true }
}

/** Cancel the workspace's B2B Intelligence add-on. Owner-only. */
export async function cancelAddon(): Promise<{ ok: true }> {
  const { workspaceId } = await requireOwner()
  const [row] = await db
    .select({ squareSubscriptionId: workspaceAddons.squareSubscriptionId })
    .from(workspaceAddons)
    .where(
      and(
        eq(workspaceAddons.workspaceId, workspaceId),
        eq(workspaceAddons.addonId, MODULE_IDS.b2bIntelligence),
      ),
    )
    .limit(1)

  if (isBillingConfigured() && row?.squareSubscriptionId) {
    await cancelSquareSubscription(row.squareSubscriptionId)
  } else {
    // Dev/no-Square: cancel locally (access continues until period end via grace).
    await clearAddonSubscription(workspaceId, MODULE_IDS.b2bIntelligence)
  }
  return { ok: true }
}

/** Cancel the workspace's Square subscription (at period end). Owner-only. */
export async function cancelSubscription(): Promise<{ ok: true }> {
  const { workspaceId } = await requireOwner()
  if (!isBillingConfigured()) throw new Error("Billing isn't set up yet.")

  const [row] = await db
    .select({ squareSubscriptionId: workspaceSettings.squareSubscriptionId })
    .from(workspaceSettings)
    .where(eq(workspaceSettings.workspaceId, workspaceId))
    .limit(1)
  if (!row?.squareSubscriptionId) throw new Error("No active subscription to cancel.")

  await cancelSquareSubscription(row.squareSubscriptionId)
  return { ok: true }
}
