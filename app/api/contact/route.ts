import { NextResponse } from "next/server"

import { contactFormSchema, sendLeadContactEmails } from "@/lib/leads/contact-email"

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  const parsed = contactFormSchema.safeParse(body)
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0]?.message ?? "Invalid form submission"
    return NextResponse.json({ error: firstIssue, details: parsed.error.flatten() }, { status: 400 })
  }

  // Honeypot tripped — silently accept and drop so bots get no signal.
  if (parsed.data.company && parsed.data.company.trim().length > 0) {
    return NextResponse.json({ ok: true })
  }

  try {
    const { notify, confirm } = await sendLeadContactEmails(parsed.data)

    if (!notify.ok) {
      // Without RESEND_API_KEY there is no way to deliver the lead. Allow local
      // development to still exercise the form, but fail loudly in production so
      // a misconfiguration never silently drops leads.
      if (notify.skipped && process.env.NODE_ENV !== "production") {
        console.warn("[contact] RESEND_API_KEY not set — lead not emailed:", {
          name: parsed.data.name,
          email: parsed.data.email,
          phone: parsed.data.phone,
        })
        return NextResponse.json({ ok: true, emailed: false })
      }
      console.error("[contact] Failed to send lead notification:", notify.error)
      return NextResponse.json(
        { error: "We couldn't send your message. Please email info@nulacrm.ai directly." },
        { status: 502 },
      )
    }

    // Confirmation failure is non-fatal: the lead already reached the inbox.
    if (!confirm.ok && !confirm.skipped) {
      console.error("[contact] Failed to send confirmation email:", confirm.error)
    }

    return NextResponse.json({ ok: true, emailed: true })
  } catch (error) {
    console.error("[contact] Unexpected error:", error)
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 })
  }
}
