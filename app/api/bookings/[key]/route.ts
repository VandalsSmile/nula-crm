import { createHmac, timingSafeEqual } from "node:crypto"

import { NextRequest, NextResponse } from "next/server"

import { processBookingIntake } from "@/lib/bookings/intake"
import { rateLimit } from "@/lib/rate-limit"
import { resolveSourceByPublicKey } from "@/lib/leads/sources"

export const runtime = "nodejs"

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-api-key",
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a)
  const bb = Buffer.from(b)
  return ab.length === bb.length && timingSafeEqual(ab, bb)
}

function verifySignature(secret: string, rawBody: string, signature: string): boolean {
  const provided = signature.replace(/^sha256=/, "").trim()
  if (!provided) return false
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex")
  const a = Buffer.from(provided, "hex")
  const b = Buffer.from(expected, "hex")
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS })
}

/**
 * Public booking/appointment webhook, resolved by a lead source's publicKey
 * (same registry as lead intake). Point a scheduling integration (Calendly,
 * Cal.com, etc.) at /api/bookings/{publicKey}.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ key: string }> }) {
  const { key } = await params
  const source = await resolveSourceByPublicKey(key)
  if (!source || !source.enabled) {
    return NextResponse.json(
      { ok: false, error: "Unknown source" },
      { status: 404, headers: CORS_HEADERS },
    )
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown"
  if (!rateLimit(`booking:${source.id}:${ip}`, 60, 60_000)) {
    return NextResponse.json(
      { ok: false, error: "Too many requests" },
      { status: 429, headers: CORS_HEADERS },
    )
  }

  const rawBody = await request.text()

  // Optional API key (when the source requires one).
  if (source.requireKey) {
    const auth = request.headers.get("authorization") ?? ""
    const bearer = /^bearer\s+/i.test(auth) ? auth.replace(/^bearer\s+/i, "").trim() : ""
    const provided =
      bearer ||
      request.headers.get("x-api-key")?.trim() ||
      new URL(request.url).searchParams.get("api_key")?.trim() ||
      ""
    if (!source.apiKey || !safeEqual(provided, source.apiKey)) {
      return NextResponse.json(
        { ok: false, error: "Missing or invalid API key" },
        { status: 401, headers: CORS_HEADERS },
      )
    }
  }

  // Signed webhooks: verify HMAC if the source has a secret.
  if (source.secret) {
    const signature =
      request.headers.get("x-nula-signature") ?? request.headers.get("x-signature") ?? ""
    if (!verifySignature(source.secret, rawBody, signature)) {
      return NextResponse.json(
        { ok: false, error: "Invalid signature" },
        { status: 401, headers: CORS_HEADERS },
      )
    }
  }

  let body: Record<string, unknown> = {}
  try {
    const parsed = JSON.parse(rawBody || "{}")
    if (parsed && typeof parsed === "object") body = parsed as Record<string, unknown>
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON" },
      { status: 400, headers: CORS_HEADERS },
    )
  }

  try {
    const result = await processBookingIntake(body, {
      workspaceId: source.userId,
      source: source.channel || source.name || "booking",
      fieldMapping: source.fieldMapping ?? undefined,
    })
    return NextResponse.json({ ok: true, ...result }, { headers: CORS_HEADERS })
  } catch {
    return NextResponse.json(
      { ok: false, error: "Could not process booking" },
      { status: 400, headers: CORS_HEADERS },
    )
  }
}
