"use server"

import { eq } from "drizzle-orm"

import { getActingUser, requireOwner } from "@/lib/auth-helpers"
import { db } from "@/lib/db"
import { workspaceSettings } from "@/lib/db/schema"
import { isBillingManager } from "@/lib/roles"
import { getStripe, isStripeConfigured } from "@/lib/stripe"
import { availablePlans, formatPrice, planById, planByPriceId } from "@/lib/billing/plans"
import { ensureCustomer } from "@/lib/billing/subscription"

function appBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    process.env.BETTER_AUTH_URL?.replace(/\/$/, "") ||
    "https://www.nulacrm.ai"
  )
}

export type PlanOption = {
  id: string
  name: string
  interval: string
  priceLabel: string
  blurb: string
}

export type BillingState = {
  configured: boolean
  canManage: boolean
  plan: string
  subscriptionStatus: string
  currentPeriodEnd: string | null
  currentPlanName: string | null
  currentInterval: string | null
  hasActiveSubscription: boolean
  plans: PlanOption[]
}

export async function getBillingState(): Promise<BillingState> {
  const { workspaceId, role } = await getActingUser()
  const [row] = await db
    .select({
      plan: workspaceSettings.plan,
      subscriptionStatus: workspaceSettings.subscriptionStatus,
      currentPeriodEnd: workspaceSettings.currentPeriodEnd,
      priceId: workspaceSettings.priceId,
      stripeSubscriptionId: workspaceSettings.stripeSubscriptionId,
    })
    .from(workspaceSettings)
    .where(eq(workspaceSettings.workspaceId, workspaceId))
    .limit(1)

  const current = row?.priceId ? planByPriceId(row.priceId) : undefined
  const hasActiveSubscription =
    Boolean(row?.stripeSubscriptionId) &&
    ["active", "trialing", "past_due"].includes(row?.subscriptionStatus ?? "")

  return {
    configured: isStripeConfigured(),
    canManage: isBillingManager(role),
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
      priceLabel: `${formatPrice(p.amount, p.currency)}/${p.interval === "year" ? "yr" : "mo"}`,
      blurb: p.blurb,
    })),
  }
}

/** Start a Stripe Checkout session for a plan. Owner-only. */
export async function createCheckoutSession(planId: string): Promise<{ url: string }> {
  const { user, workspaceId } = await requireOwner()
  if (!isStripeConfigured()) throw new Error("Billing isn't set up yet.")
  const plan = planById(planId)
  if (!plan || !plan.priceId) throw new Error("That plan isn't available.")

  const customerId = await ensureCustomer(workspaceId, { email: user.email, name: user.name })
  const base = appBaseUrl()
  const session = await getStripe().checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: plan.priceId, quantity: 1 }],
    client_reference_id: workspaceId,
    subscription_data: { metadata: { workspaceId } },
    allow_promotion_codes: true,
    success_url: `${base}/app/settings?tab=plan&checkout=success`,
    cancel_url: `${base}/app/settings?tab=plan&checkout=cancel`,
  })
  if (!session.url) throw new Error("Could not start checkout.")
  return { url: session.url }
}

/** Open the Stripe billing portal to manage/cancel a subscription. Owner-only. */
export async function createBillingPortalSession(): Promise<{ url: string }> {
  const { workspaceId } = await requireOwner()
  if (!isStripeConfigured()) throw new Error("Billing isn't set up yet.")
  const [row] = await db
    .select({ stripeCustomerId: workspaceSettings.stripeCustomerId })
    .from(workspaceSettings)
    .where(eq(workspaceSettings.workspaceId, workspaceId))
    .limit(1)
  if (!row?.stripeCustomerId) throw new Error("No billing account yet.")

  const session = await getStripe().billingPortal.sessions.create({
    customer: row.stripeCustomerId,
    return_url: `${appBaseUrl()}/app/settings?tab=plan`,
  })
  return { url: session.url }
}
