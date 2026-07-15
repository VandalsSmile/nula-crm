import "server-only"

type SendResult = { ok: boolean; skipped: boolean; error?: string }

// Resend's verified sending domain is nulacrm.ai. Reuse the configured
// from-address if present, otherwise fall back to the shared default.
const INVITE_FROM =
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
 * Emails a teammate their private invite link via Resend. When RESEND_API_KEY
 * is not configured (e.g. local dev), the link is logged instead so the flow is
 * still testable. The invite row/link is created regardless of the send result,
 * so the caller can surface a copyable-link fallback if email delivery fails.
 */
export async function sendTeamInviteEmail(params: {
  to: string
  url: string
  invitedByName: string
  role: string
  expiresInDays: number
}): Promise<SendResult> {
  const { to, url, invitedByName, role, expiresInDays } = params
  const key = process.env.RESEND_API_KEY?.trim()
  if (!key) {
    console.log(`[team] Invite link for ${to} (${role}): ${url}`)
    return { ok: false, skipped: true, error: "RESEND_API_KEY not configured" }
  }

  const inviter = invitedByName?.trim() || "A teammate"
  const safeInviter = escapeHtml(inviter)
  const safeRole = escapeHtml(role)
  const safeUrl = escapeHtml(url)
  const subject = `${inviter} invited you to Nula CRM`

  const html = `
    <div style="font-family: -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; color: #1b1533; line-height: 1.6; max-width: 520px; margin: 0 auto;">
      <h2 style="margin: 0 0 16px;">You're invited to Nula CRM</h2>
      <p style="margin: 0 0 12px;"><strong>${safeInviter}</strong> has invited you to join their Nula workspace as <strong>${safeRole}</strong>.</p>
      <p style="margin: 0 0 24px;">Nula is an AI-first CRM for small business — capture leads, follow up, and grow, all in one place.</p>
      <p style="margin: 0 0 24px;">
        <a href="${safeUrl}" style="display: inline-block; background: #4F3DF5; color: #ffffff; text-decoration: none; font-weight: 600; padding: 12px 22px; border-radius: 999px;">Accept your invite</a>
      </p>
      <p style="margin: 0 0 8px; font-size: 13px; color: #6b6685;">Or paste this link into your browser:</p>
      <p style="margin: 0 0 24px; font-size: 13px; word-break: break-all;"><a href="${safeUrl}" style="color: #4F3DF5;">${safeUrl}</a></p>
      <p style="margin: 0; font-size: 13px; color: #6b6685;">This invite expires in ${expiresInDays} days. If you weren't expecting it, you can safely ignore this email.</p>
    </div>
  `.trim()

  const text = [
    "You're invited to Nula CRM",
    "",
    `${inviter} has invited you to join their Nula workspace as ${role}.`,
    "",
    "Accept your invite:",
    url,
    "",
    `This invite expires in ${expiresInDays} days. If you weren't expecting it, you can ignore this email.`,
  ].join("\n")

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: INVITE_FROM, to, subject, html, text }),
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
