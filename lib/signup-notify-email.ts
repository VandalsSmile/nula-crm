import "server-only"

type SendResult = { ok: boolean; skipped: boolean; error?: string }

// Where new-account notifications are sent. Defaults to the founder's inbox;
// override with SIGNUP_NOTIFY_TO if it should change.
const NOTIFY_TO = process.env.SIGNUP_NOTIFY_TO?.trim() || "jason@vs.marketing"
const NOTIFY_FROM =
  process.env.RESEND_FROM_EMAIL?.trim() ||
  process.env.LEAD_CONFIRM_FROM?.trim() ||
  "Nula CRM <info@nulacrm.ai>"

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

/**
 * Notifies the admin inbox whenever a brand-new user account is created (a
 * self-serve trial sign-up or any new account). Best-effort: it never throws and
 * skips gracefully when RESEND_API_KEY is not configured (e.g. local dev), so it
 * can't block or break the sign-up flow.
 */
export async function sendSignupNotificationEmail(user: {
  email?: string | null
  name?: string | null
  id?: string | null
}): Promise<SendResult> {
  const email = user.email?.trim() ?? ""
  const name = user.name?.trim() || "(no name)"
  const key = process.env.RESEND_API_KEY?.trim()
  if (!key) {
    console.log(`[signup] New account (would notify ${NOTIFY_TO}): ${name} <${email}>`)
    return { ok: false, skipped: true, error: "RESEND_API_KEY not configured" }
  }

  const when = new Date().toUTCString()
  const safeName = escapeHtml(name)
  const safeEmail = escapeHtml(email)
  const subject = `New Nula sign-up: ${email || name}`

  const html = `
    <div style="font-family: -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; color: #1b1533; line-height: 1.6; max-width: 520px; margin: 0 auto;">
      <h2 style="margin: 0 0 16px;">New Nula account created</h2>
      <p style="margin: 0 0 8px;"><strong>Name:</strong> ${safeName}</p>
      <p style="margin: 0 0 8px;"><strong>Email:</strong> ${safeEmail || "(none)"}</p>
      <p style="margin: 0 0 16px;"><strong>When:</strong> ${escapeHtml(when)}</p>
      <p style="margin: 0; font-size: 13px; color: #6b6685;">A new user just signed up for Nula CRM (a new trial account). Reply to this email to reach them directly.</p>
    </div>
  `.trim()

  const text = [
    "New Nula account created",
    "",
    `Name: ${name}`,
    `Email: ${email || "(none)"}`,
    `When: ${when}`,
    "",
    "A new user just signed up for Nula CRM (a new trial account).",
  ].join("\n")

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: NOTIFY_FROM,
        to: NOTIFY_TO,
        subject,
        html,
        text,
        // Replying goes straight to the new user when we have their address.
        ...(email ? { reply_to: email } : {}),
      }),
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
