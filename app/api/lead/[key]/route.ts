import { createHmac, timingSafeEqual } from "node:crypto"

import { NextRequest, NextResponse } from "next/server"

import { processLeadIntake } from "@/lib/leads/intake"
import { resolveSourceByPublicKey, type LeadChannel, type LeadSourceRow } from "@/lib/leads/sources"
import { verifyTurnstile } from "@/lib/turnstile"

export const runtime = "nodejs"

// Hidden field bots tend to fill in. Real users leave it blank.
const HONEYPOT_FIELD = "company_website"

/** Read a nested value by dot path (e.g. "payload.email"). */
function getPath(obj: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc == null) return undefined
    return (acc as Record<string, unknown>)[key]
  }, obj)
}

/** Constant-time compare of the provided HMAC signature against the expected one. */
function verifySignature(secret: string, rawBody: string, signature: string): boolean {
  const provided = signature.replace(/^sha256=/, "").trim()
  if (!provided) return false
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex")
  const a = Buffer.from(provided, "hex")
  const b = Buffer.from(expected, "hex")
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
}

function str(value: unknown): string {
  return typeof value === "string" ? value.trim() : ""
}

function successHtml(message: string): string {
  const safe = message.replace(/</g, "&lt;").replace(/>/g, "&gt;")
  return `<!doctype html><html><head><meta charset="utf-8"><title>Thank you</title><meta name="viewport" content="width=device-width, initial-scale=1"><style>body{font-family:system-ui,sans-serif;display:flex;min-height:100vh;align-items:center;justify-content:center;margin:0;background:#faf9fc;color:#1c1630}.card{max-width:28rem;padding:2rem;text-align:center}</style></head><body><div class="card"><h1>Thanks!</h1><p>${safe}</p></div></body></html>`
}

function finish(source: LeadSourceRow, isFormPost: boolean): NextResponse {
  const message = source.successMessage || "Thanks! We'll be in touch soon."
  if (isFormPost) {
    if (source.redirectUrl) return NextResponse.redirect(source.redirectUrl, 303)
    return new NextResponse(successHtml(message), {
      status: 200,
      headers: { "content-type": "text/html; charset=utf-8" },
    })
  }
  return NextResponse.json({ ok: true, message }, { headers: CORS_HEADERS })
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS })
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ key: string }> }) {
  const { key } = await params
  const source = await resolveSourceByPublicKey(key)
  if (!source || !source.enabled) {
    return NextResponse.json(
      { ok: false, error: "Unknown lead source" },
      { status: 404, headers: CORS_HEADERS },
    )
  }

  const contentType = request.headers.get("content-type") ?? ""
  const rawBody = await request.text()

  // Signed webhooks: if the source has a secret, require a valid HMAC signature.
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

  const data: Record<string, unknown> = {}
  let isFormPost = false

  if (contentType.includes("application/json")) {
    try {
      const body = JSON.parse(rawBody || "{}")
      if (body && typeof body === "object") Object.assign(data, body)
    } catch {
      // leave data empty
    }
  } else {
    isFormPost = true
    const params = new URLSearchParams(rawBody)
    for (const [k, v] of params.entries()) data[k] = v
  }

  // Honeypot: silently accept so bots don't learn they were caught.
  if (str(data[HONEYPOT_FIELD])) {
    return finish(source, isFormPost)
  }

  // CAPTCHA (only enforced if a token is supplied; verify is a no-op without a secret).
  const token = str(data["cf-turnstile-response"]) || str(data["captchaToken"])
  if (token) {
    const result = await verifyTurnstile(token, request.headers.get("x-forwarded-for") ?? undefined)
    if (!result.ok) {
      return NextResponse.json(
        { ok: false, error: "Captcha verification failed" },
        { status: 400, headers: CORS_HEADERS },
      )
    }
  }

  // Field mapping: translate provider field names (dot paths ok) → canonical.
  const mapped: Record<string, unknown> = { ...data }
  for (const [incoming, canonical] of Object.entries(source.fieldMapping ?? {})) {
    const value = incoming.includes(".") ? getPath(data, incoming) : data[incoming]
    if (value !== undefined && value !== null) mapped[canonical] = value
  }

  // UTM attribution from body and/or query string.
  const q = new URL(request.url).searchParams
  const utmField = (name: string) => str(mapped[`utm_${name}`]) || q.get(`utm_${name}`)?.trim() || ""
  const utm = {
    source: utmField("source"),
    medium: utmField("medium"),
    campaign: utmField("campaign"),
    term: utmField("term"),
    content: utmField("content"),
  }
  const cleanedUtm = Object.fromEntries(Object.entries(utm).filter(([, v]) => v))

  // Name handling: split a full name if first/last weren't provided.
  const fullName = str(mapped.name) || str(mapped.fullName)
  let firstName = str(mapped.firstName)
  let lastName = str(mapped.lastName)
  if (!firstName && fullName) {
    const parts = fullName.split(/\s+/)
    firstName = parts[0]
    lastName = parts.slice(1).join(" ")
  }

  const canonical = {
    firstName: firstName || fullName || "Website lead",
    lastName,
    email: str(mapped.email),
    phone: str(mapped.phone),
    message: str(mapped.message),
    notes: str(mapped.notes),
    interest: str(mapped.interest),
    source: source.key,
    utm: Object.keys(cleanedUtm).length ? cleanedUtm : undefined,
    referrer: str(mapped.referrer) || request.headers.get("referer") || "",
    landingPage: str(mapped.landingPage),
  }

  try {
    await processLeadIntake(canonical, {
      source: { key: source.key, name: source.name, channel: source.channel as LeadChannel },
      workspaceId: source.userId,
    })
  } catch {
    return NextResponse.json(
      { ok: false, error: "Could not process lead" },
      { status: 400, headers: CORS_HEADERS },
    )
  }

  return finish(source, isFormPost)
}
