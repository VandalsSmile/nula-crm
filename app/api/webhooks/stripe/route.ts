import { NextRequest, NextResponse } from "next/server"
import { getStripe, isBillingConfigured } from "@/lib/stripe"
import { syncStripeSubscription } from "@/lib/billing/stripe-sync"

export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  if (!isBillingConfigured()) {
    return NextResponse.json(
      { error: "Billing not configured" },
      { status: 503 }
    )
  }
  const stripe = getStripe()
  let event
  try {
    event = stripe.webhooks.constructEvent(
      await request.text(),
      request.headers.get("stripe-signature") ?? "",
      process.env.STRIPE_WEBHOOK_SECRET!.trim()
    )
  } catch {
    return NextResponse.json(
      { error: "Invalid webhook signature or payload" },
      { status: 400 }
    )
  }
  try {
    if (
      event.type === "customer.subscription.created" ||
      event.type === "customer.subscription.updated" ||
      event.type === "customer.subscription.deleted"
    ) {
      await syncStripeSubscription(event.data.object.id)
    } else if (
      event.type === "checkout.session.completed" ||
      event.type === "checkout.session.async_payment_succeeded"
    ) {
      const session = event.data.object
      const id =
        typeof session.subscription === "string"
          ? session.subscription
          : session.subscription?.id
      if (id && session.metadata?.app === "nula-crm")
        await syncStripeSubscription(id)
    } else if (
      event.type === "invoice.paid" ||
      event.type === "invoice.payment_failed"
    ) {
      const subscription =
        event.data.object.parent?.subscription_details?.subscription
      const id =
        typeof subscription === "string" ? subscription : subscription?.id
      if (id) await syncStripeSubscription(id)
    }
  } catch (error) {
    console.error("Stripe webhook processing failed", {
      eventId: event.id,
      type: event.type,
      error,
    })
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    )
  }
  return NextResponse.json({ received: true })
}
