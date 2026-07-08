import { NextRequest, NextResponse } from "next/server"

import { ingestInboundMessage } from "@/lib/inbox/messages"
import { processLeadIntake } from "@/lib/leads/intake"
import { resolveSourceByPublicKey, type LeadChannel } from "@/lib/leads/sources"

export const runtime = "nodejs"

function str(value: unknown): string {
  return typeof value === "string" ? value.trim() : ""
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

/** Read a value from the first field name that is present (provider-agnostic). */
function first(data: Record<string, unknown>, keys: string[]): string {
  for (const k of keys) {
    const v = str(data[k])
    if (v) return v
  }
  return ""
}

export async function POST(request: NextRequest) {
  const contentType = request.headers.get("content-type") ?? ""
  const data: Record<string, unknown> = {}

  if (contentType.includes("application/json")) {
    const body = await request.json().catch(() => ({}))
    if (body && typeof body === "object") Object.assign(data, body)
  } else {
    const form = await request.formData().catch(() => null)
    if (form) for (const [k, v] of form.entries()) data[k] = typeof v === "string" ? v : ""
  }

  // Recipient: support common inbound-parse shapes (Resend/Postmark/SendGrid/Mailgun).
  const recipientRaw =
    first(data, ["to", "recipient", "To", "OriginalRecipient"]) ||
    (typeof data.envelope === "object" && data.envelope
      ? str((data.envelope as Record<string, unknown>).to)
      : "")

  const token = tokenFromRecipient(recipientRaw) || str(new URL(request.url).searchParams.get("key"))
  const source = token ? await resolveSourceByPublicKey(token) : null
  if (!source || !source.enabled) {
    return NextResponse.json({ ok: false, error: "Unknown inbound address" }, { status: 404 })
  }
  const workspaceId = source.userId

  const fromRaw = first(data, ["from", "sender", "From"])
  const { name, email } = parseAddress(fromRaw)
  if (!email) {
    return NextResponse.json({ ok: false, error: "Missing sender address" }, { status: 400 })
  }

  const subject = first(data, ["subject", "Subject"])
  const text = first(data, [
    "text",
    "body",
    "body-plain",
    "stripped-text",
    "TextBody",
    "plain",
  ])
  const bodyText = text || subject || "(no content)"

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
