import "server-only"

import { z } from "zod"

export const contactFormSchema = z.object({
  name: z.string().trim().min(1, "Please tell us your name").max(120),
  email: z.string().trim().email("Please enter a valid email").max(200),
  phone: z.string().trim().max(40).optional().default(""),
  message: z.string().trim().min(1, "Please add a short message").max(4000),
  // Honeypot: legitimate users never fill this hidden field. Bots usually do.
  company: z.string().max(200).optional().default(""),
})

export type ContactFormInput = z.infer<typeof contactFormSchema>

// The Resend domain (nulacrm.ai) is verified. Addresses can be overridden via
// env if they ever change, but default to the requested lead-routing setup.
const NOTIFY_TO = process.env.LEAD_NOTIFY_TO?.trim() || "info@nulacrm.ai"
const NOTIFY_FROM = process.env.LEAD_NOTIFY_FROM?.trim() || "Nula Website <no-reply@nulacrm.ai>"
const CONFIRM_FROM = process.env.LEAD_CONFIRM_FROM?.trim() || "Nula CRM <info@nulacrm.ai>"
const NOTIFY_SUBJECT = "New lead from Nula site!"
const CONFIRM_SUBJECT = "Thanks for reaching out to Nula"

type SendResult = { ok: boolean; skipped: boolean; error?: string }

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

function toHtmlParagraph(value: string) {
  return escapeHtml(value).replace(/\r?\n/g, "<br>")
}

async function sendEmail(payload: {
  from: string
  to: string
  subject: string
  html: string
  text: string
  reply_to?: string
}): Promise<SendResult> {
  const resendKey = process.env.RESEND_API_KEY?.trim()
  if (!resendKey) {
    return { ok: false, skipped: true, error: "RESEND_API_KEY not configured" }
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const detail = await response.text().catch(() => "")
      return { ok: false, skipped: false, error: `Resend responded ${response.status}: ${detail}` }
    }

    return { ok: true, skipped: false }
  } catch (error) {
    return {
      ok: false,
      skipped: false,
      error: error instanceof Error ? error.message : "Resend request failed",
    }
  }
}

/**
 * Emails a new website lead to the Nula inbox and sends the submitter a
 * confirmation. The notification result is what determines success — if it
 * fails, the lead would otherwise be lost.
 */
export async function sendLeadContactEmails(input: ContactFormInput) {
  const name = input.name.trim()
  const email = input.email.trim()
  const phone = input.phone?.trim() ?? ""
  const message = input.message.trim()
  const firstName = name.split(/\s+/)[0] || "there"

  const notifyHtml = `
    <div style="font-family: -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; color: #1b1533; line-height: 1.6;">
      <h2 style="margin: 0 0 16px;">New lead from the Nula site</h2>
      <p style="margin: 0 0 8px;"><strong>Name:</strong> ${escapeHtml(name)}</p>
      <p style="margin: 0 0 8px;"><strong>Email:</strong> <a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a></p>
      ${phone ? `<p style="margin: 0 0 8px;"><strong>Phone:</strong> ${escapeHtml(phone)}</p>` : ""}
      <p style="margin: 16px 0 4px;"><strong>Message:</strong></p>
      <p style="margin: 0; padding: 12px 16px; background: #f7f6fb; border-radius: 12px;">${toHtmlParagraph(message)}</p>
    </div>
  `.trim()

  const notifyText = [
    "New lead from the Nula site",
    "",
    `Name: ${name}`,
    `Email: ${email}`,
    phone ? `Phone: ${phone}` : null,
    "",
    "Message:",
    message,
  ]
    .filter((line) => line !== null)
    .join("\n")

  const confirmHtml = `
    <div style="font-family: -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; color: #1b1533; line-height: 1.6;">
      <h2 style="margin: 0 0 16px;">Thanks for reaching out, ${escapeHtml(firstName)}!</h2>
      <p style="margin: 0 0 12px;">We got your message and someone from the Nula team will get back to you shortly.</p>
      <p style="margin: 0 0 4px;">Here's a copy of what you sent us:</p>
      <p style="margin: 0 0 16px; padding: 12px 16px; background: #f7f6fb; border-radius: 12px;">${toHtmlParagraph(message)}</p>
      <p style="margin: 0;">— The Nula team<br><a href="mailto:info@nulacrm.ai">info@nulacrm.ai</a></p>
    </div>
  `.trim()

  const confirmText = [
    `Thanks for reaching out, ${firstName}!`,
    "",
    "We got your message and someone from the Nula team will get back to you shortly.",
    "",
    "Here's a copy of what you sent us:",
    message,
    "",
    "— The Nula team",
    "info@nulacrm.ai",
  ].join("\n")

  const notify = await sendEmail({
    from: NOTIFY_FROM,
    to: NOTIFY_TO,
    subject: NOTIFY_SUBJECT,
    // Replying to the lead notification goes straight to the prospect.
    reply_to: email,
    html: notifyHtml,
    text: notifyText,
  })

  const confirm = await sendEmail({
    from: CONFIRM_FROM,
    to: email,
    subject: CONFIRM_SUBJECT,
    html: confirmHtml,
    text: confirmText,
  })

  return { notify, confirm }
}
