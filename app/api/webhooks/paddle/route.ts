import { NextRequest, NextResponse } from "next/server"
import { EventName, type Subscription } from "@paddle/paddle-node-sdk"

import { getPaddle, isPaddleConfigured } from "@/lib/paddle"
import {
  applySubscription,
  clearSubscription,
  findWorkspaceByCustomer,
} from "@/lib/billing/subscription"

export const runtime = "nodejs"

async function workspaceForSubscription(sub: Subscription): Promise<string | null> {
  const custom = sub.customData as { workspaceId?: string } | null
  if (custom?.workspaceId) return custom.workspaceId
  return sub.customerId ? findWorkspaceByCustomer(sub.customerId) : null
}

export async function POST(request: NextRequest) {
  const secret = process.env.PADDLE_WEBHOOK_SECRET?.trim()
  if (!isPaddleConfigured() || !secret) {
    return NextResponse.json({ ok: false, error: "Billing not configured" }, { status: 503 })
  }

  const signature = request.headers.get("paddle-signature") ?? ""
  // Paddle signs the raw body — never parse before verifying.
  const rawBody = await request.text()

  let event
  try {
    event = await getPaddle().webhooks.unmarshal(rawBody, secret, signature)
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Invalid signature" },
      { status: 400 },
    )
  }
  if (!event) {
    return NextResponse.json({ ok: false, error: "Invalid signature" }, { status: 400 })
  }

  try {
    switch (event.eventType) {
      case EventName.SubscriptionCreated:
      case EventName.SubscriptionActivated:
      case EventName.SubscriptionUpdated: {
        const sub = event.data as Subscription
        const workspaceId = await workspaceForSubscription(sub)
        if (workspaceId) await applySubscription(workspaceId, sub)
        break
      }
      case EventName.SubscriptionCanceled: {
        const sub = event.data as Subscription
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
