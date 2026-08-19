import { htmlToPlainText, sanitizeEmailHtml } from "@/lib/email/sanitize"

export type EmailBrand = {
  companyName: string
  logoUrl: string
  supportEmail: string
  address: string
  website: string
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

/**
 * Render a branded marketing email: header logo, an optional featured image
 * above the copy, the author's rich-text body, and a footer with the account's
 * contact info + the legally-expected disclaimers (who it's from, physical
 * address, and an unsubscribe path). Returns email-safe HTML + a text part.
 */
export function renderCampaignEmail(opts: {
  brand: EmailBrand
  bodyHtml: string
  featuredImageUrl?: string
  previewText?: string
  /** Per-recipient one-click unsubscribe URL. Falls back to a mailto opt-out. */
  unsubscribeUrl?: string
}): { html: string; text: string } {
  const { brand } = opts
  const company = brand.companyName?.trim() || "Our team"
  const body = sanitizeEmailHtml(opts.bodyHtml || "")
  const featured = opts.featuredImageUrl?.trim() || ""
  const logo = brand.logoUrl?.trim() || ""
  const support = brand.supportEmail?.trim() || ""
  const address = brand.address?.trim() || ""
  const website = brand.website?.trim() || ""
  const unsubUrl = opts.unsubscribeUrl?.trim() || ""
  const preview = (opts.previewText || htmlToPlainText(body)).slice(0, 140)

  const header = logo
    ? `<img src="${escapeHtml(logo)}" alt="${escapeHtml(company)}" height="44" style="display:block;max-height:44px;border:0;outline:none;text-decoration:none;" />`
    : `<span style="font-size:18px;font-weight:600;color:#1e1633;">${escapeHtml(company)}</span>`

  const featuredBlock = featured
    ? `<tr><td style="padding:0 0 20px 0;"><img src="${escapeHtml(featured)}" alt="" width="600" style="display:block;width:100%;max-width:600px;height:auto;border-radius:8px;border:0;" /></td></tr>`
    : ""

  const unsubscribe = unsubUrl
    ? `<a href="${escapeHtml(unsubUrl)}" style="color:#6b7280;text-decoration:underline;">Unsubscribe</a>`
    : support
      ? `<a href="mailto:${escapeHtml(support)}?subject=Unsubscribe" style="color:#6b7280;text-decoration:underline;">Unsubscribe</a>`
      : "Reply with &ldquo;unsubscribe&rdquo; to opt out."

  const footerBits = [
    `<strong>${escapeHtml(company)}</strong>`,
    address ? escapeHtml(address) : "",
    website ? `<a href="${escapeHtml(website)}" style="color:#6b7280;">${escapeHtml(website)}</a>` : "",
  ]
    .filter(Boolean)
    .join(" &middot; ")

  const html = `<!doctype html>
<html>
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /></head>
<body style="margin:0;padding:0;background:#f4f4f7;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preview)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f7;padding:24px 12px;">
  <tr><td align="center">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #ececf1;">
      <tr><td style="padding:24px 32px;border-bottom:1px solid #f0f0f4;">${header}</td></tr>
      <tr><td style="padding:28px 32px 0 32px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          ${featuredBlock}
          <tr><td style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#2c2440;">${body}</td></tr>
        </table>
      </td></tr>
      <tr><td style="padding:28px 32px;">
        <hr style="border:0;border-top:1px solid #f0f0f4;margin:0 0 16px 0;" />
        <p style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:12px;line-height:1.6;color:#6b7280;margin:0;">
          ${footerBits}<br/>
          You&rsquo;re receiving this because you&rsquo;re a contact of ${escapeHtml(company)}. ${unsubscribe}
        </p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`

  const text = [
    htmlToPlainText(body),
    "",
    "—",
    company,
    address,
    website,
    unsubUrl
      ? `Unsubscribe: ${unsubUrl}`
      : support
        ? `Unsubscribe: email ${support} with subject "Unsubscribe".`
        : "",
  ]
    .filter(Boolean)
    .join("\n")

  return { html, text }
}
