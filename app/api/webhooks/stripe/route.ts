import { NextRequest, NextResponse } from "next/server"
import type Stripe from "stripe"

import { getStripe, isStripeConfigured } from "@/lib/stripe"
import {
  applySubscription,
  clearSubscription,
  findWorkspaceByCustomer,
} from "@/lib/billing/subscription"

export const runtime = "nodejs"

async function workspaceForSubscription(sub: Stripe.Subscription): Promise<string | null> {
  const fromMeta = sub.metadata?.workspaceId
  if (fromMeta) return fromMeta
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer?.id
  return customerId ? findWorkspaceByCustomer(customerId) : null
}

export async function POST(request: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim()
  if (!isStripeConfigured() || !secret) {
    return NextResponse.json({ ok: false, error: "Billing not configured" }, { status: 503 })
  }

  const signature = request.headers.get("stripe-signature") ?? ""
  const rawBody = await request.text()

  let event: Stripe.Event
  try {
    event = getStripe().webhooks.constructEvent(rawBody, signature, secret)
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Invalid signature" },
      { status: 400 },
    )
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session
        const workspaceId = session.client_reference_id || session.metadata?.workspaceId
        if (workspaceId && session.subscription) {
          const subId =
            typeof session.subscription === "string"
              ? session.subscription
              : session.subscription.id
          const sub = await getStripe().subscriptions.retrieve(subId)
          await applySubscription(workspaceId, sub)
        }
        break
      }
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription
        const workspaceId = await workspaceForSubscription(sub)
        if (workspaceId) await applySubscription(workspaceId, sub)
        break
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription
        const workspaceId = await workspaceForSubscription(sub)
        if (workspaceId) await clearSubscription(workspaceId)
        break
      }
      default:
        break
    }
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Webhook handler failed" },
      { status: 500 },
    )
  }

  return NextResponse.json({ received: true })
}
