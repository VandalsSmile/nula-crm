import { NextRequest, NextResponse } from "next/server"

import { processLeadIntake } from "@/lib/leads/intake"
import { resolveSourceByPublicKey, type LeadChannel, type LeadSourceRow } from "@/lib/leads/sources"
import { verifyTurnstile } from "@/lib/turnstile"

export const runtime = "nodejs"

// Hidden field bots tend to fill in. Real users leave it blank.
const HONEYPOT_FIELD = "company_website"

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
  const data: Record<string, unknown> = {}
  let isFormPost = false

  if (contentType.includes("application/json")) {
    const body = await request.json().catch(() => ({}))
    if (body && typeof body === "object") Object.assign(data, body)
  } else {
    isFormPost = true
    const form = await request.formData().catch(() => null)
    if (form) {
      for (const [k, v] of form.entries()) data[k] = typeof v === "string" ? v : ""
    }
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

  // Field mapping: translate provider field names → canonical names.
  const mapped: Record<string, unknown> = { ...data }
  for (const [incoming, canonical] of Object.entries(source.fieldMapping ?? {})) {
    if (data[incoming] !== undefined) mapped[canonical] = data[incoming]
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
