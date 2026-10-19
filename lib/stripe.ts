import "server-only"

import Stripe from "stripe"
import { randomUUID } from "node:crypto"

export function isBillingConfigured(): boolean {
  return Boolean(
    process.env.STRIPE_SECRET_KEY?.trim() &&
    process.env.STRIPE_WEBHOOK_SECRET?.trim()
  )
}

export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY?.trim()
  if (!key) throw new Error("Stripe is not configured.")
  return new Stripe(key)
}

export async function createSubscriptionCheckout(params: {
  workspaceId: string
  customerId: string
  priceId: string
  amount: number
  currency: string
  interval: "month" | "year"
  addonId?: string
  origin: string
}): Promise<{ url: string }> {
  const stripe = getStripe()
  const price = await stripe.prices.retrieve(params.priceId)
  if (
    !price.active ||
    price.type !== "recurring" ||
    price.unit_amount !== params.amount ||
    price.currency !== params.currency ||
    price.recurring?.interval !== params.interval ||
    price.recurring.interval_count !== 1
  ) {
    throw new Error(
      "The Stripe price does not match this plan. Please contact support."
    )
  }
  const metadata = {
    app: "nula-crm",
    workspaceId: params.workspaceId,
    kind: params.addonId ? "addon" : "base",
    priceId: params.priceId,
    ...(params.addonId ? { addonId: params.addonId } : {}),
  }
  // Reuse an open checkout rather than creating multiple purchasable sessions.
  const sessions = await stripe.checkout.sessions.list({
    customer: params.customerId,
    status: "open",
    limit: 100,
  })
  const owned = sessions.data.filter(
    (session) =>
      session.metadata?.app === metadata.app &&
      session.metadata?.workspaceId === metadata.workspaceId &&
      session.metadata?.kind === metadata.kind
  )
  const existing = owned.find(
    (session) => session.metadata?.priceId === params.priceId && session.url
  )
  // Changing monthly/annual selection invalidates the previous checkout link.
  for (const session of owned) {
    if (session.id !== existing?.id)
      await stripe.checkout.sessions.expire(session.id)
  }
  if (existing?.url) return { url: existing.url }

  const automaticTax = process.env.STRIPE_AUTOMATIC_TAX === "true"
  const session = await stripe.checkout.sessions.create(
    {
      mode: "subscription",
      automatic_tax: { enabled: automaticTax },
      ...(automaticTax
        ? {
            billing_address_collection: "required" as const,
            customer_update: { address: "auto" as const },
          }
        : {}),
      customer: params.customerId,
      client_reference_id: params.workspaceId,
      line_items: [{ price: params.priceId, quantity: 1 }],
      metadata,
      subscription_data: { metadata },
      success_url: `${params.origin}/app/settings?tab=plan&checkout=success${params.addonId ? `&addon=${params.addonId}` : ""}`,
      cancel_url: `${params.origin}/app/settings?tab=plan&checkout=canceled`,
    },
    {
      idempotencyKey: `nula-checkout:${params.workspaceId}:${metadata.kind}:${params.priceId}:${randomUUID()}`,
    }
  )
  if (!session.url) throw new Error("Stripe did not return a checkout URL.")
  return { url: session.url }
}

export async function cancelStripeSubscription(id: string): Promise<void> {
  if (!id) throw new Error("No subscription to cancel.")
  await getStripe().subscriptions.update(id, { cancel_at_period_end: true })
}
