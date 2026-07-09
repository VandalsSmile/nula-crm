"use server"

import { eq } from "drizzle-orm"

import { getActingUser, requireOwner } from "@/lib/auth-helpers"
import { db } from "@/lib/db"
import { workspaceSettings } from "@/lib/db/schema"
import { isBillingManager } from "@/lib/roles"
import { getPaddle, isPaddleConfigured } from "@/lib/paddle"
import { availablePlans, formatPrice, planByPriceId } from "@/lib/billing/plans"

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
      paddleSubscriptionId: workspaceSettings.paddleSubscriptionId,
    })
    .from(workspaceSettings)
    .where(eq(workspaceSettings.workspaceId, workspaceId))
    .limit(1)

  const current = row?.priceId ? planByPriceId(row.priceId) : undefined
  const hasActiveSubscription =
    Boolean(row?.paddleSubscriptionId) &&
    ["active", "trialing", "past_due"].includes(row?.subscriptionStatus ?? "")

  return {
    configured: isPaddleConfigured(),
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

/** Open the Paddle customer portal to manage/cancel a subscription. Owner-only. */
export async function createBillingPortalSession(): Promise<{ url: string }> {
  const { workspaceId } = await requireOwner()
  if (!isPaddleConfigured()) throw new Error("Billing isn't set up yet.")

  const [row] = await db
    .select({
      paddleCustomerId: workspaceSettings.paddleCustomerId,
      paddleSubscriptionId: workspaceSettings.paddleSubscriptionId,
    })
    .from(workspaceSettings)
    .where(eq(workspaceSettings.workspaceId, workspaceId))
    .limit(1)
  if (!row?.paddleCustomerId) throw new Error("No billing account yet.")

  const session = await getPaddle().customerPortalSessions.create(
    row.paddleCustomerId,
    row.paddleSubscriptionId ? [row.paddleSubscriptionId] : [],
  )
  const url = session.urls?.general?.overview
  if (!url) throw new Error("Could not open the billing portal.")
  return { url }
}
