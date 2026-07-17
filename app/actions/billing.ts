"use server"

import { eq } from "drizzle-orm"
import { headers } from "next/headers"

import { getActingUser, requireOwner } from "@/lib/auth-helpers"
import { db } from "@/lib/db"
import { workspaceSettings } from "@/lib/db/schema"
import { isBillingManager } from "@/lib/roles"
import {
  cancelSquareSubscription,
  createSubscriptionPaymentLink,
  isBillingConfigured,
} from "@/lib/square"
import { availablePlans, formatPrice, planById, planByPriceId } from "@/lib/billing/plans"

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

/** Create a Square-hosted checkout for a plan and return its URL. Owner-only. */
export async function createCheckout(planId: string): Promise<{ url: string }> {
  const { user } = await requireOwner()
  if (!isBillingConfigured()) throw new Error("Billing isn't set up yet.")

  const plan = planById(planId)
  if (!plan || !plan.priceId) throw new Error("That plan isn't available.")

  const origin = appOrigin(await headers())
  const { url } = await createSubscriptionPaymentLink({
    planVariationId: plan.priceId,
    amountCents: plan.amount,
    planName: `${plan.name} (${plan.interval === "year" ? "annual" : "monthly"})`,
    buyerEmail: user.email,
    redirectUrl: `${origin}/app/settings?tab=plan&checkout=success`,
  })
  return { url }
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
