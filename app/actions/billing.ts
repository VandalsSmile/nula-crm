"use server"

import { and, eq, sql } from "drizzle-orm"
import { headers } from "next/headers"

import { getActingUser, requireOwner } from "@/lib/auth-helpers"
import { db } from "@/lib/db"
import { workspaceAddons, workspaceSettings } from "@/lib/db/schema"
import { isBillingManager } from "@/lib/roles"
import {
  cancelStripeSubscription,
  createSubscriptionCheckout,
  getStripe,
  isBillingConfigured,
} from "@/lib/stripe"
import {
  addonById,
  availableAddons,
  availablePlans,
  formatPrice,
  planById,
  planByPriceId,
} from "@/lib/billing/plans"
import { getModuleState, MODULE_IDS, type ModuleState } from "@/lib/modules"
import { defaultCompanyModel } from "@/lib/crm-defaults"
import { syncStripeSubscription } from "@/lib/billing/stripe-sync"
import {
  clearAddonSubscription,
  enableAddonLocally,
} from "@/lib/billing/addons"

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
  manualActivationAllowed: boolean
  canManage: boolean
  workspaceId: string
  customerEmail: string
  plan: string
  subscriptionStatus: string
  currentPeriodEnd: string | null
  currentPlanName: string | null
  currentInterval: string | null
  canOpenPortal: boolean
  cancelAtPeriodEnd: boolean
  hasActiveSubscription: boolean
  plans: PlanOption[]
}

export async function getBillingState(): Promise<BillingState> {
  const { user, workspaceId, role } = await getActingUser()
  const [row] = await db
    .select({
      plan: workspaceSettings.plan,
      stripeCustomerId: workspaceSettings.stripeCustomerId,
      subscriptionStatus: workspaceSettings.subscriptionStatus,
      currentPeriodEnd: workspaceSettings.currentPeriodEnd,
      priceId: workspaceSettings.priceId,
      cancelAtPeriodEnd: workspaceSettings.cancelAtPeriodEnd,
      stripeSubscriptionId: workspaceSettings.stripeSubscriptionId,
    })
    .from(workspaceSettings)
    .where(eq(workspaceSettings.workspaceId, workspaceId))
    .limit(1)

  const current = row?.priceId ? planByPriceId(row.priceId) : undefined
  const hasActiveSubscription =
    Boolean(row?.stripeSubscriptionId) &&
    [
      "active",
      "trialing",
      "past_due",
      "unpaid",
      "incomplete",
      "paused",
    ].includes(row?.subscriptionStatus ?? "")

  return {
    configured: isBillingConfigured(),
    manualActivationAllowed:
      process.env.NODE_ENV !== "production" && !isBillingConfigured(),
    canManage: isBillingManager(role),
    workspaceId,
    customerEmail: user.email,
    plan: row?.plan ?? "trial",
    subscriptionStatus: row?.subscriptionStatus ?? "",
    currentPeriodEnd: row?.currentPeriodEnd?.toISOString() ?? null,
    currentPlanName: current?.name ?? null,
    currentInterval: current?.interval ?? null,
    hasActiveSubscription,
    cancelAtPeriodEnd: row?.cancelAtPeriodEnd ?? false,
    canOpenPortal: Boolean(row?.stripeCustomerId) && isBillingConfigured(),
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
  const explicit =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.BETTER_AUTH_URL?.trim()
  if (explicit) return new URL(explicit).origin
  if (process.env.NODE_ENV === "production")
    throw new Error("App URL is not configured.")
  return `http://${h.get("host") ?? "localhost:3000"}`
}

/** Serialize customer/checkout creation for each workspace. */
async function startCheckout(
  workspaceId: string,
  email: string,
  plan: NonNullable<ReturnType<typeof planById>>,
  addonId?: string
) {
  return db.transaction(async (tx) => {
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtextextended(${`nula-billing:${workspaceId}`}, 0))`
    )
    const [row] = await tx
      .select()
      .from(workspaceSettings)
      .where(eq(workspaceSettings.workspaceId, workspaceId))
      .limit(1)
    if (!row) throw new Error("Complete workspace setup before subscribing.")
    if (row.squareSubscriptionId)
      throw new Error(
        "Please contact support to migrate your existing subscription."
      )
    let subscriptionId = row.stripeSubscriptionId
    if (addonId) {
      const [addon] = await tx
        .select()
        .from(workspaceAddons)
        .where(
          and(
            eq(workspaceAddons.workspaceId, workspaceId),
            eq(workspaceAddons.addonId, addonId)
          )
        )
        .limit(1)
      if (addon?.squareSubscriptionId)
        throw new Error(
          "Please contact support to migrate your existing add-on."
        )
      subscriptionId = addon?.stripeSubscriptionId ?? ""
    }
    if (subscriptionId) {
      const subscription =
        await getStripe().subscriptions.retrieve(subscriptionId)
      if (!["canceled", "incomplete_expired"].includes(subscription.status)) {
        throw new Error(
          "A subscription already exists. Manage it from billing settings."
        )
      }
    }
    let customerId = row.stripeCustomerId
    if (!customerId) {
      const customer = await getStripe().customers.create(
        {
          email,
          metadata: { app: "nula-crm", workspaceId },
        },
        { idempotencyKey: `nula-customer:${workspaceId}` }
      )
      customerId = customer.id
      await tx
        .update(workspaceSettings)
        .set({ stripeCustomerId: customerId })
        .where(eq(workspaceSettings.workspaceId, workspaceId))
    }
    // Stripe may have completed Checkout before its webhook reaches us.
    for await (const subscription of getStripe().subscriptions.list({
      customer: customerId,
      status: "all",
      limit: 100,
    })) {
      const metadata = subscription.metadata
      if (
        metadata.app === "nula-crm" &&
        metadata.workspaceId === workspaceId &&
        metadata.kind === (addonId ? "addon" : "base") &&
        !["canceled", "incomplete_expired"].includes(subscription.status)
      ) {
        throw new Error(
          "A subscription already exists. Manage it from billing settings."
        )
      }
    }
    return createSubscriptionCheckout({
      workspaceId,
      customerId,
      priceId: plan.priceId,
      amount: plan.amount,
      currency: plan.currency,
      interval: plan.interval,
      addonId,
      origin: appOrigin(await headers()),
    })
  })
}

/**
 * Create a Stripe-hosted checkout for a plan. Owner-only. Returns the URL on
 * success or a human-readable error (returned as data so it survives to the
 * client, unlike a thrown server-action error which prod redacts).
 */
export async function createCheckout(
  planId: string
): Promise<{ url?: string; error?: string }> {
  const { user, workspaceId } = await requireOwner()
  if (!isBillingConfigured()) return { error: "Billing isn't set up yet." }

  const plan = planById(planId)
  if (!plan || !plan.priceId) return { error: "That plan isn't available." }

  try {
    const { url } = await startCheckout(workspaceId, user.email, plan)
    return { url }
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Could not start checkout",
    }
  }
}

// ── B2B Intelligence add-on (a second subscription, independent of base plan) ──

export type AddonState = {
  module: ModuleState
  companyModel: string
  configured: boolean
  manualActivationAllowed: boolean
  canManage: boolean
  plans: PlanOption[]
}

/** Add-on state for the Plan tab: module status, promotion hint, and purchasable add-ons. */
export async function getAddonState(): Promise<AddonState> {
  const { workspaceId, role } = await getActingUser()
  const [row] = await db
    .select({
      companyModel: workspaceSettings.companyModel,
      businessType: workspaceSettings.businessType,
    })
    .from(workspaceSettings)
    .where(eq(workspaceSettings.workspaceId, workspaceId))
    .limit(1)

  // Explicit choice wins; otherwise infer a promotion hint from the vertical.
  const companyModel =
    row?.companyModel?.trim() || defaultCompanyModel(row?.businessType)

  return {
    module: await getModuleState(MODULE_IDS.b2bIntelligence),
    companyModel,
    configured: isBillingConfigured(),
    manualActivationAllowed:
      process.env.NODE_ENV !== "production" && !isBillingConfigured(),
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

/** Start Stripe checkout for an add-on subscription. Owner-only. */
export async function createAddonCheckout(
  planId: string
): Promise<{ url?: string; error?: string }> {
  const { user, workspaceId } = await requireOwner()
  if (!isBillingConfigured()) return { error: "Billing isn't set up yet." }

  const addon = addonById(planId)
  if (!addon || !addon.priceId) return { error: "That add-on isn't available." }

  try {
    const { url } = await startCheckout(
      workspaceId,
      user.email,
      addon,
      addon.addonId
    )
    return { url }
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Could not start checkout",
    }
  }
}

/**
 * Dev/no-Stripe fallback: enable the add-on immediately. When Stripe is
 * configured, callers must go through checkout instead.
 */
export async function enableAddonNow(): Promise<{ ok: true }> {
  const { user, workspaceId } = await requireOwner()
  if (process.env.NODE_ENV === "production" || isBillingConfigured()) {
    throw new Error("Please subscribe through checkout to enable this add-on.")
  }
  await enableAddonLocally(workspaceId, MODULE_IDS.b2bIntelligence, user.id)
  return { ok: true }
}

/** Cancel the workspace's B2B Intelligence add-on. Owner-only. */
export async function cancelAddon(): Promise<{ ok: true }> {
  const { workspaceId } = await requireOwner()
  const [row] = await db
    .select({ stripeSubscriptionId: workspaceAddons.stripeSubscriptionId })
    .from(workspaceAddons)
    .where(
      and(
        eq(workspaceAddons.workspaceId, workspaceId),
        eq(workspaceAddons.addonId, MODULE_IDS.b2bIntelligence)
      )
    )
    .limit(1)

  if (row?.stripeSubscriptionId) {
    if (!isBillingConfigured()) throw new Error("Billing isn't set up yet.")
    await cancelStripeSubscription(row.stripeSubscriptionId)
    await syncStripeSubscription(row.stripeSubscriptionId)
  } else {
    if (process.env.NODE_ENV === "production")
      throw new Error(
        "No Stripe add-on subscription to cancel. Contact support."
      )
    // Dev/no-Stripe: cancel locally (access continues until period end via grace).
    await clearAddonSubscription(workspaceId, MODULE_IDS.b2bIntelligence)
  }
  return { ok: true }
}

/** Cancel the workspace's Stripe subscription (at period end). Owner-only. */
export async function cancelSubscription(): Promise<{ ok: true }> {
  const { workspaceId } = await requireOwner()
  if (!isBillingConfigured()) throw new Error("Billing isn't set up yet.")

  const [row] = await db
    .select({ stripeSubscriptionId: workspaceSettings.stripeSubscriptionId })
    .from(workspaceSettings)
    .where(eq(workspaceSettings.workspaceId, workspaceId))
    .limit(1)
  if (!row?.stripeSubscriptionId)
    throw new Error("No active subscription to cancel.")

  await cancelStripeSubscription(row.stripeSubscriptionId)
  await syncStripeSubscription(row.stripeSubscriptionId)
  return { ok: true }
}

/** Owner-only hosted portal for invoices, payment methods, and subscriptions. */
export async function createBillingPortal(): Promise<{
  url?: string
  error?: string
}> {
  const { workspaceId } = await requireOwner()
  if (!isBillingConfigured()) return { error: "Billing isn't set up yet." }
  try {
    const [row] = await db
      .select({ customerId: workspaceSettings.stripeCustomerId })
      .from(workspaceSettings)
      .where(eq(workspaceSettings.workspaceId, workspaceId))
      .limit(1)
    if (!row?.customerId) return { error: "No Stripe billing account yet." }
    const session = await getStripe().billingPortal.sessions.create({
      customer: row.customerId,
      configuration:
        process.env.STRIPE_PORTAL_CONFIGURATION_ID?.trim() || undefined,
      return_url: `${appOrigin(await headers())}/app/settings?tab=plan`,
    })
    return { url: session.url }
  } catch {
    return { error: "Could not open billing. Please contact support." }
  }
}
