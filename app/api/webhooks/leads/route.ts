import { NextResponse } from "next/server"

import { z } from "zod"

import { leadIntakeSchema, processLeadIntake } from "@/lib/leads/intake"

function verifyWebhookSecret(request: Request): boolean {
  const secret = process.env.LEAD_WEBHOOK_SECRET?.trim()
  if (!secret) return process.env.NODE_ENV !== "production"
  const header = request.headers.get("x-webhook-secret") ?? request.headers.get("authorization")?.replace(/^Bearer\s+/i, "")
  return header === secret
}

export async function POST(request: Request) {
  if (!verifyWebhookSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const result = await processLeadIntake(body, { source: { key: "webhook" } })
    return NextResponse.json({ ok: true, ...result })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid payload", details: error.flatten() }, { status: 400 })
    }
    console.error("Lead webhook error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Lead intake failed" },
      { status: 500 },
    )
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    endpoint: "/api/webhooks/leads",
    method: "POST",
    auth: "x-webhook-secret header or Authorization: Bearer <LEAD_WEBHOOK_SECRET>",
    schema: leadIntakeSchema.shape,
  })
}
