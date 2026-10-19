import "server-only"

import { and, eq, sql } from "drizzle-orm"
import type Stripe from "stripe"
import { db } from "@/lib/db"
import { workspaceAddons, workspaceSettings } from "@/lib/db/schema"
import { getStripe } from "@/lib/stripe"
import { addonByPriceId, planByPriceId } from "@/lib/billing/plans"
import { applySubscription } from "@/lib/billing/subscription"
import { applyAddonSubscription } from "@/lib/billing/addons"

export function subscriptionTarget(sub: Stripe.Subscription) {
  const metadata = sub.metadata
  if (metadata.app !== "nula-crm" || !metadata.workspaceId) return null
  if (sub.items.data.length !== 1 || sub.items.has_more)
    throw new Error("Unexpected Nula subscription items")
  const item = sub.items.data[0]
  if (item.quantity !== 1) throw new Error("Unexpected subscription quantity")
  const priceId = item.price.id
  const addon = addonByPriceId(priceId)
  if (
    metadata.kind === "addon" &&
    addon &&
    metadata.addonId === addon.addonId
  ) {
    return {
      workspaceId: metadata.workspaceId,
      addonId: addon.addonId,
      priceId,
      periodEnd: item.current_period_end,
    }
  }
  if (metadata.kind === "base" && planByPriceId(priceId)) {
    return {
      workspaceId: metadata.workspaceId,
      addonId: null,
      priceId,
      periodEnd: item.current_period_end,
    }
  }
  throw new Error("Unrecognized Nula subscription price or kind")
}

/** Fetch current Stripe state under a workspace lock: replays and out-of-order
 * events converge on the same state without re-granting enrichment credits. */
export async function syncStripeSubscription(id: string): Promise<void> {
  const stripe = getStripe()
  const initial = await stripe.subscriptions.retrieve(id)
  if (initial.metadata.app !== "nula-crm" || !initial.metadata.workspaceId)
    return
  const workspaceId = initial.metadata.workspaceId
  await db.transaction(async (tx) => {
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtextextended(${`nula-billing:${workspaceId}`}, 0))`
    )
    const sub = await stripe.subscriptions.retrieve(id)
    const target = subscriptionTarget(sub)
    if (!target || target.workspaceId !== workspaceId)
      throw new Error("Subscription workspace changed")
    const customerId =
      typeof sub.customer === "string" ? sub.customer : sub.customer.id
    const [workspace] = await tx
      .select()
      .from(workspaceSettings)
      .where(eq(workspaceSettings.workspaceId, workspaceId))
      .limit(1)
    if (!workspace || workspace.stripeCustomerId !== customerId)
      throw new Error("Subscription customer does not match workspace")
    let existingId = workspace.stripeSubscriptionId
    if (target.addonId) {
      const [addon] = await tx
        .select()
        .from(workspaceAddons)
        .where(
          and(
            eq(workspaceAddons.workspaceId, workspaceId),
            eq(workspaceAddons.addonId, target.addonId)
          )
        )
        .limit(1)
      existingId = addon?.stripeSubscriptionId ?? ""
    }
    // A late event from a previous subscription must not overwrite its replacement.
    if (existingId && existingId !== sub.id) {
      if (["canceled", "incomplete_expired"].includes(sub.status)) return
      const existing = await stripe.subscriptions.retrieve(existingId)
      if (!["canceled", "incomplete_expired"].includes(existing.status)) {
        throw new Error("Multiple subscriptions for the same workspace plan")
      }
    }
    const end =
      sub.status === "canceled"
        ? Math.min(target.periodEnd, sub.ended_at ?? target.periodEnd)
        : target.periodEnd
    const state = {
      subscriptionId: sub.id,
      customerId,
      priceId: target.priceId,
      status: sub.status,
      currentPeriodEnd: new Date(end * 1000),
      cancelAtPeriodEnd: sub.cancel_at_period_end,
    }
    if (target.addonId) await applyAddonSubscription(workspaceId, state, "", tx)
    else await applySubscription(workspaceId, state, tx)
  })
}
