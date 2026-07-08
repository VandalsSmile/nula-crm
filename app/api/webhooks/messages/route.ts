import { NextResponse } from "next/server"

import { z } from "zod"

import { ingestInboundMessage, inboundMessageSchema } from "@/lib/inbox/messages"

function verifyWebhookSecret(request: Request): boolean {
  const secret = process.env.LEAD_WEBHOOK_SECRET?.trim()
  if (!secret) return process.env.NODE_ENV !== "production"
  const header =
    request.headers.get("x-webhook-secret") ??
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "")
  return header === secret
}

export async function POST(request: Request) {
  if (!verifyWebhookSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const result = await ingestInboundMessage(body)
    return NextResponse.json({ ok: true, ...result })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid payload", details: error.flatten() }, { status: 400 })
    }
    console.error("Message webhook error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Message intake failed" },
      { status: 500 },
    )
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    endpoint: "/api/webhooks/messages",
    method: "POST",
    auth: "x-webhook-secret header or Authorization: Bearer <LEAD_WEBHOOK_SECRET>",
    schema: inboundMessageSchema.shape,
  })
}
