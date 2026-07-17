import "server-only"

import { eq } from "drizzle-orm"

import { db } from "@/lib/db"
import { workspaceSettings } from "@/lib/db/schema"

/** Square subscription statuses that grant full access. */
const ACTIVE_STATUSES = new Set(["ACTIVE", "PENDING", "PAUSED"])

export type SubscriptionState = {
  subscriptionId: string
  customerId: string
  status: string
  planVariationId: string
  currentPeriodEnd: Date | null
}

/** Persist a Square subscription's state onto the workspace. */
export async function applySubscription(
  workspaceId: string,
  sub: SubscriptionState,
): Promise<void> {
  const active = ACTIVE_STATUSES.has(sub.status.toUpperCase())
  const set = {
    plan: active ? "active" : "trial",
    subscriptionStatus: sub.status.toLowerCase(),
    squareSubscriptionId: sub.subscriptionId,
    squareCustomerId: sub.customerId,
    priceId: sub.planVariationId,
    currentPeriodEnd: sub.currentPeriodEnd,
    updatedAt: new Date(),
  }

  await db
    .insert(workspaceSettings)
    .values({ workspaceId, ...set, onboardingComplete: true })
    .onConflictDoUpdate({ target: workspaceSettings.workspaceId, set })
}

/** Revert to trial/upsell when a subscription ends. */
export async function clearSubscription(workspaceId: string): Promise<void> {
  await db
    .update(workspaceSettings)
    .set({
      plan: "trial",
      subscriptionStatus: "canceled",
      squareSubscriptionId: "",
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
    .where(eq(workspaceSettings.squareCustomerId, customerId))
    .limit(1)
  return row?.workspaceId ?? null
}
