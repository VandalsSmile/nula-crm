import "server-only"

import { eq, sql } from "drizzle-orm"

import { db } from "@/lib/db"
import { workspaceSettings } from "@/lib/db/schema"

/** Stripe subscription statuses that grant full access. */
const ACTIVE_STATUSES = new Set(["ACTIVE", "TRIALING", "PAST_DUE"])

export type SubscriptionState = {
  subscriptionId: string
  customerId: string
  status: string
  priceId: string
  currentPeriodEnd: Date | null
  cancelAtPeriodEnd?: boolean
}

/** Persist a Stripe subscription's state onto the workspace. */
export async function applySubscription(
  workspaceId: string,
  sub: SubscriptionState,
  executor: Pick<typeof db, "insert" | "update" | "select"> = db,
): Promise<void> {
  const active = ACTIVE_STATUSES.has(sub.status.toUpperCase())
  const set = {
    plan: sql`case when ${workspaceSettings.plan} = 'free' then 'free' else ${active ? "active" : "trial"} end`,
    subscriptionStatus: sub.status.toLowerCase(),
    stripeSubscriptionId: sub.subscriptionId,
    stripeCustomerId: sub.customerId,
    priceId: sub.priceId,
    currentPeriodEnd: sub.currentPeriodEnd,
    cancelAtPeriodEnd: sub.cancelAtPeriodEnd ?? false,
    updatedAt: new Date(),
  }

  await executor
    .insert(workspaceSettings)
    .values({ workspaceId, ...set, plan: active ? "active" : "trial", onboardingComplete: true })
    .onConflictDoUpdate({ target: workspaceSettings.workspaceId, set })
}

/** Revert to trial/upsell when a subscription ends. */
export async function clearSubscription(workspaceId: string): Promise<void> {
  await db
    .update(workspaceSettings)
    .set({
      plan: "trial",
      subscriptionStatus: "canceled",
      stripeSubscriptionId: "",
      priceId: "",
      currentPeriodEnd: null,
      updatedAt: new Date(),
    })
    .where(eq(workspaceSettings.workspaceId, workspaceId))
}

export async function findWorkspaceByCustomer(customerId: string): Promise<string | null> {
  if (!customerId) return null
  const [row] = await db
    .select({ workspaceId: workspaceSettings.workspaceId })
    .from(workspaceSettings)
    .where(eq(workspaceSettings.stripeCustomerId, customerId))
    .limit(1)
  return row?.workspaceId ?? null
}
