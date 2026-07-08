import "server-only"

import { eq } from "drizzle-orm"
import type Stripe from "stripe"

import { db } from "@/lib/db"
import { workspaceSettings } from "@/lib/db/schema"
import { getStripe } from "@/lib/stripe"

/** Statuses that grant full access. */
const ACTIVE_STATUSES = new Set(["active", "trialing", "past_due"])

function periodEndOf(sub: Stripe.Subscription): Date | null {
  // `current_period_end` lives on the subscription (older API) or its first
  // item (newer API). Read defensively so we work across versions.
  const item = sub.items?.data?.[0] as { current_period_end?: number } | undefined
  const ts =
    (sub as unknown as { current_period_end?: number }).current_period_end ??
    item?.current_period_end
  return ts ? new Date(ts * 1000) : null
}

/** Get-or-create the Stripe customer for a workspace and persist its id. */
export async function ensureCustomer(
  workspaceId: string,
  opts: { email?: string; name?: string },
): Promise<string> {
  const [row] = await db
    .select({ stripeCustomerId: workspaceSettings.stripeCustomerId })
    .from(workspaceSettings)
    .where(eq(workspaceSettings.workspaceId, workspaceId))
    .limit(1)
  if (row?.stripeCustomerId) return row.stripeCustomerId

  const customer = await getStripe().customers.create({
    email: opts.email,
    name: opts.name,
    metadata: { workspaceId },
  })

  await db
    .insert(workspaceSettings)
    .values({ workspaceId, stripeCustomerId: customer.id })
    .onConflictDoUpdate({
      target: workspaceSettings.workspaceId,
      set: { stripeCustomerId: customer.id, updatedAt: new Date() },
    })
  return customer.id
}

/** Persist a Stripe subscription's state onto the workspace. */
export async function applySubscription(
  workspaceId: string,
  sub: Stripe.Subscription,
): Promise<void> {
  const active = ACTIVE_STATUSES.has(sub.status)
  const priceId = sub.items?.data?.[0]?.price?.id ?? ""
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id

  const set = {
    plan: active ? "active" : "trial",
    subscriptionStatus: sub.status,
    stripeSubscriptionId: sub.id,
    stripeCustomerId: customerId,
    priceId,
    currentPeriodEnd: periodEndOf(sub),
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
