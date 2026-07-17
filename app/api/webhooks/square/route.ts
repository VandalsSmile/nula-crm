import { NextRequest, NextResponse } from "next/server"
import { eq } from "drizzle-orm"

import { db } from "@/lib/db"
import { user as userTable } from "@/lib/db/schema"
import { sharedWorkspaceId } from "@/lib/workspace-scope"
import {
  isBillingConfigured,
  retrieveCustomerEmail,
  retrieveSubscription,
  verifySquareSignature,
  type SquareSubscription,
} from "@/lib/square"
import {
  applySubscription,
  clearSubscription,
  findWorkspaceByCustomer,
} from "@/lib/billing/subscription"

export const runtime = "nodejs"

const ENDED_STATUSES = new Set(["CANCELED", "DEACTIVATED"])

async function findWorkspaceByOwnerEmail(email: string): Promise<string | null> {
  if (!email) return null
  const [row] = await db
    .select({ id: userTable.id })
    .from(userTable)
    .where(eq(userTable.email, email))
    .limit(1)
  // A workspace owner's id is their workspace id (self-serve accounts).
  return row?.id ?? null
}

async function workspaceForSubscription(sub: SquareSubscription): Promise<string | null> {
  const shared = sharedWorkspaceId()
  if (shared) return shared
  if (sub.customer_id) {
    const byCustomer = await findWorkspaceByCustomer(sub.customer_id)
    if (byCustomer) return byCustomer
    const email = await retrieveCustomerEmail(sub.customer_id)
    if (email) return findWorkspaceByOwnerEmail(email)
  }
  return null
}

function toState(sub: SquareSubscription) {
  return {
    subscriptionId: sub.id,
    customerId: sub.customer_id ?? "",
    status: sub.status,
    planVariationId: sub.plan_variation_id ?? "",
    currentPeriodEnd: sub.charged_through_date ? new Date(sub.charged_through_date) : null,
  }
}

async function handleSubscription(sub: SquareSubscription) {
  const workspaceId = await workspaceForSubscription(sub)
  if (!workspaceId) return
  if (ENDED_STATUSES.has(sub.status.toUpperCase())) {
    await clearSubscription(workspaceId)
  } else {
    await applySubscription(workspaceId, toState(sub))
  }
}

export async function POST(request: NextRequest) {
  if (!isBillingConfigured() || !process.env.SQUARE_WEBHOOK_SIGNATURE_KEY?.trim()) {
    return NextResponse.json({ ok: false, error: "Billing not configured" }, { status: 503 })
  }

  const rawBody = await request.text()
  const signature = request.headers.get("x-square-hmacsha256-signature") ?? ""
  const notificationUrl =
    process.env.SQUARE_WEBHOOK_URL?.trim() || new URL(request.url).toString()
  if (!verifySquareSignature(rawBody, signature, notificationUrl)) {
    return NextResponse.json({ ok: false, error: "Invalid signature" }, { status: 401 })
  }

  let body: Record<string, unknown> = {}
  try {
    body = JSON.parse(rawBody) as Record<string, unknown>
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid payload" }, { status: 400 })
  }

  const type = String(body.type ?? "")
  const data = (body.data as Record<string, unknown> | undefined) ?? {}
  const object = (data.object as Record<string, unknown> | undefined) ?? {}

  try {
    if (type === "subscription.created" || type === "subscription.updated") {
      const sub = object.subscription as SquareSubscription | undefined
      if (sub?.id) await handleSubscription(sub)
    } else if (type === "invoice.payment_made") {
      const invoice = object.invoice as { subscription_id?: string } | undefined
      const sub = invoice?.subscription_id
        ? await retrieveSubscription(invoice.subscription_id)
        : null
      if (sub?.id) await handleSubscription(sub)
    }
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Webhook handler failed" },
      { status: 500 },
    )
  }

  return NextResponse.json({ received: true })
}
