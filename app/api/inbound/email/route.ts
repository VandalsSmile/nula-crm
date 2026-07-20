import { createHmac, timingSafeEqual } from "node:crypto"

import { NextRequest, NextResponse } from "next/server"

import { ingestInboundMessage } from "@/lib/inbox/messages"
import { processLeadIntake } from "@/lib/leads/intake"
import { resolveSourceByPublicKey, type LeadChannel } from "@/lib/leads/sources"
import { logMailboxEmail, resolveEmailConnectionByToken } from "@/lib/email/mailbox"

export const runtime = "nodejs"

function str(value: unknown): string {
  return typeof value === "string" ? value.trim() : ""
}

/** Flatten a string | string[] (Resend uses arrays for to/cc/received_for). */
function collectStrings(value: unknown): string[] {
  if (typeof value === "string") return value.trim() ? [value.trim()] : []
  if (Array.isArray(value)) return value.flatMap(collectStrings)
  return []
}

/** Parse "Display Name <email@host>" or a bare address. */
function parseAddress(input: string): { name: string; email: string } {
  const s = input.trim()
  const m = s.match(/^"?([^"<]*)"?\s*<([^>]+)>$/)
  if (m) return { name: m[1].trim(), email: m[2].trim().toLowerCase() }
  return { name: "", email: s.toLowerCase() }
}

/** Extract the plus-address token from `leads+{token}@host`. */
function tokenFromRecipient(recipient: string): string {
  const { email } = parseAddress(recipient)
  const local = email.split("@")[0] ?? ""
  const plus = local.split("+")[1] ?? ""
  return plus.trim()
}

function firstToken(recipients: string[]): string {
  for (const r of recipients) {
    const t = tokenFromRecipient(r)
    if (t) return t
  }
  return ""
}

function first(data: Record<string, unknown>, keys: string[]): string {
  for (const k of keys) {
    const v = str(data[k])
    if (v) return v
  }
  return ""
}

function htmlToText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim()
}

/**
 * Verify a Resend/Svix webhook signature. Only enforced when
 * RESEND_INBOUND_SIGNING_SECRET is configured; otherwise skipped so setup
 * isn't blocked before the secret is added.
 */
function verifySvixSignature(secret: string, req: NextRequest, rawBody: string): boolean {
  const id = req.headers.get("svix-id") ?? req.headers.get("webhook-id")
  const ts = req.headers.get("svix-timestamp") ?? req.headers.get("webhook-timestamp")
  const sigHeader = req.headers.get("svix-signature") ?? req.headers.get("webhook-signature")
  if (!id || !ts || !sigHeader) return false
  const key = Buffer.from(secret.replace(/^whsec_/, ""), "base64")
  const expected = createHmac("sha256", key).update(`${id}.${ts}.${rawBody}`).digest("base64")
  const expectedBuf = Buffer.from(expected)
  return sigHeader.split(" ").some((part) => {
    const comma = part.indexOf(",")
    const value = comma >= 0 ? part.slice(comma + 1) : part
    const valueBuf = Buffer.from(value)
    return valueBuf.length === expectedBuf.length && timingSafeEqual(valueBuf, expectedBuf)
  })
}

type FetchedEmail = {
  text: string
  subject: string
  from: string
  to: string[]
  cc: string[]
}

/**
 * Fetch the full received email via the Resend Received Emails API. The webhook
 * payload carries only metadata (and, for a BCC'd copy, its `to`/`received_for`
 * reflect the *delivered-to* address, not the message's real `To` header). The
 * receiving API returns the true `from`/`to`/`cc` headers plus the body, which
 * we need to resolve the real counterparty for a BCC'd/forwarded email.
 */
async function fetchResendEmail(emailId: string): Promise<FetchedEmail | null> {
  const apiKey = process.env.RESEND_API_KEY?.trim()
  if (!apiKey || !emailId) return null
  try {
    const res = await fetch(`https://api.resend.com/emails/receiving/${emailId}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    })
    if (!res.ok) return null
    const data = (await res.json()) as {
      text?: string | null
      html?: string | null
      subject?: string | null
      from?: string | null
      to?: string | string[] | null
      cc?: string | string[] | null
    }
    const text = str(data.text) || (data.html ? htmlToText(data.html) : "")
    return {
      text,
      subject: str(data.subject),
      from: str(data.from),
      to: collectStrings(data.to),
      cc: collectStrings(data.cc),
    }
  } catch {
    return null
  }
}

export async function POST(request: NextRequest) {
  const contentType = request.headers.get("content-type") ?? ""
  const rawBody = await request.text()

  // Parse the payload (Resend/most providers send JSON; some send form data).
  let body: Record<string, unknown> = {}
  if (contentType.includes("application/json") || rawBody.trimStart().startsWith("{")) {
    try {
      const parsed = JSON.parse(rawBody || "{}")
      if (parsed && typeof parsed === "object") body = parsed as Record<string, unknown>
    } catch {
      // leave body empty
    }
  } else {
    const params = new URLSearchParams(rawBody)
    for (const [k, v] of params.entries()) body[k] = v
  }

  // Resend nests everything under `data`; other providers are flat.
  const isResend =
    str(body.type) === "email.received" || (body.data !== undefined && typeof body.data === "object")
  const data = isResend ? ((body.data as Record<string, unknown>) ?? {}) : body

  // Optional signature verification (Resend uses Svix headers).
  const signingSecret = process.env.RESEND_INBOUND_SIGNING_SECRET?.trim()
  if (signingSecret && !verifySvixSignature(signingSecret, request, rawBody)) {
    return NextResponse.json({ ok: false, error: "Invalid signature" }, { status: 401 })
  }

  // Resolve the workspace from the recipient plus-address (or a ?key= override).
  const recipients = [
    ...collectStrings(data.to),
    ...collectStrings(data.received_for),
    ...collectStrings(data.recipient),
    ...collectStrings(data.To),
    ...collectStrings(data.cc),
    ...collectStrings(data.Cc),
    // BCC is normally stripped from headers, but include it if the provider
    // surfaces it (some do) so a BCC'd dropbox address is still recognized.
    ...collectStrings(data.bcc),
    ...collectStrings(data.Bcc),
    ...collectStrings((data.envelope as Record<string, unknown> | undefined)?.to),
  ]
  const token =
    firstToken(recipients) || str(new URL(request.url).searchParams.get("key"))

  // Observability: one concise line per inbound so we can trace delivery,
  // address routing, and processing outcome in the logs.
  console.log(
    "[inbound/email]",
    JSON.stringify({
      isResend,
      keys: Object.keys(data),
      recipients,
      tokenLen: token.length,
      hasFrom: Boolean(first(data, ["from", "sender", "From"])),
    }),
  )

  if (!token) {
    console.warn("[inbound/email] no token in recipients — returning 404")
    return NextResponse.json({ ok: false, error: "Unknown inbound address" }, { status: 404 })
  }

  // Resend webhooks carry only metadata, and a BCC'd copy's `to`/`received_for`
  // reflect the delivered-to (dropbox) address rather than the message's real
  // `To`. Fetch the full message so we have the body and true From/To/Cc headers.
  const fetched = data.email_id ? await fetchResendEmail(str(data.email_id)) : null

  // Parse sender (fall back to the fetched header if the webhook omits it).
  const fromRaw = first(data, ["from", "sender", "From"]) || (fetched?.from ?? "")
  const { name, email } = parseAddress(fromRaw)
  if (!email) {
    return NextResponse.json({ ok: false, error: "Missing sender address" }, { status: 400 })
  }

  const subject = first(data, ["subject", "Subject"]) || (fetched?.subject ?? "")
  let text = first(data, ["text", "body", "body-plain", "stripped-text", "TextBody", "plain"])
  if (!text && data.html) text = htmlToText(str(data.html))
  if (!text && fetched) text = fetched.text

  const bodyText = text || subject || "(no content)"
  const externalId =
    str(data.email_id) || first(data, ["message_id", "Message-Id", "messageId", "Message-ID"])

  // Personal email dropbox: a user BCC'd/forwarded mail to me+{token}@… — log it
  // against the matching contact (no lead scoring/tagging).
  const connection = await resolveEmailConnectionByToken(token)
  if (connection) {
    // Combine the webhook recipients with the true To/Cc headers from the
    // fetched message — a BCC'd copy hides the real recipient in the webhook,
    // so without this the counterparty can't be resolved.
    const recipientEmails = [
      ...recipients,
      ...(fetched ? [...fetched.to, ...fetched.cc] : []),
    ]
      .map((r) => parseAddress(r).email)
      .filter(Boolean)
    try {
      const result = await logMailboxEmail(
        { fromEmail: email, fromName: name, recipientEmails, subject, body: bodyText, externalId },
        connection,
      )
      console.log("[inbound/email] mailbox", JSON.stringify({ from: email, recipientEmails, result }))
      return NextResponse.json({ ok: true, ...result })
    } catch (err) {
      console.error("[inbound/email] mailbox error", err)
      return NextResponse.json(
        { ok: false, error: err instanceof Error ? err.message : "Could not log email" },
        { status: 400 },
      )
    }
  }

  // Otherwise this is a lead-source inbound address.
  const source = await resolveSourceByPublicKey(token)
  if (!source || !source.enabled) {
    console.warn(
      "[inbound/email] token matched neither a mailbox connection nor an enabled lead source",
      JSON.stringify({ tokenLen: token.length }),
    )
    return NextResponse.json({ ok: false, error: "Unknown inbound address" }, { status: 404 })
  }
  const workspaceId = source.userId
  const [firstName, ...rest] = (name || email.split("@")[0]).split(/\s+/)

  try {
    // 1) Lead pipeline: create/update the contact, score, tag, route.
    await processLeadIntake(
      {
        firstName: firstName || "Email lead",
        lastName: rest.join(" "),
        email,
        source: source.key,
        message: subject ? `${subject}\n\n${text}` : text,
      },
      {
        source: { key: source.key, name: source.name, channel: source.channel as LeadChannel },
        workspaceId,
      },
    )

    // 2) Inbox: record the email as an inbound conversation message.
    await ingestInboundMessage(
      { email, name, channel: "email", subject, body: bodyText },
      { workspaceId },
    )
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Could not process email" },
      { status: 400 },
    )
  }

  return NextResponse.json({ ok: true })
}
