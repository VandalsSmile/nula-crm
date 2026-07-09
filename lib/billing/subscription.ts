import "server-only"

import { eq } from "drizzle-orm"
import type { Subscription } from "@paddle/paddle-node-sdk"

import { db } from "@/lib/db"
import { workspaceSettings } from "@/lib/db/schema"

/** Statuses that grant full access. */
const ACTIVE_STATUSES = new Set(["active", "trialing", "past_due"])

/** Persist a Paddle subscription's state onto the workspace. */
export async function applySubscription(
  workspaceId: string,
  sub: Subscription,
): Promise<void> {
  const active = ACTIVE_STATUSES.has(sub.status)
  const priceId = sub.items?.[0]?.price?.id ?? ""
  const endsAt = sub.currentBillingPeriod?.endsAt
    ? new Date(sub.currentBillingPeriod.endsAt)
    : null

  const set = {
    plan: active ? "active" : "trial",
    subscriptionStatus: sub.status,
    paddleSubscriptionId: sub.id,
    paddleCustomerId: sub.customerId ?? "",
    priceId,
    currentPeriodEnd: endsAt,
    updatedAt: new Date(),
  }

  await db
    .insert(workspaceSettings)
    .values({ workspaceId, ...set, onboardingComplete: true })
    .onConflictDoUpdate({ target: workspaceSettings.workspaceId, set })
}

/** Clear subscription state when a subscription ends (reverts to trial/upsell). */
export async function clearSubscription(workspaceId: string): Promise<void> {
  await db
    .update(workspaceSettings)
    .set({
      plan: "trial",
      subscriptionStatus: "canceled",
      paddleSubscriptionId: "",
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
    .where(eq(workspaceSettings.paddleCustomerId, customerId))
    .limit(1)
  return row?.workspaceId ?? null
}
