/**
 * Pure signature rendering (no DB / no server-only) so it's unit-testable and
 * reusable. `lib/email/signature.ts` wraps these with DB access.
 */

export type SignatureFields = {
  enabled?: boolean
  fullName?: string
  title?: string
  company?: string
  phone?: string
  email?: string
  website?: string
  logoUrl?: string
  /** Intended 1× display size (px). Kept crisp on retina via a 2× source image. */
  logoWidth?: number
  logoHeight?: number
  tagline?: string
}

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

function normalizeUrl(url: string): string {
  const u = url.trim()
  if (!u) return ""
  return /^https?:\/\//i.test(u) ? u : `https://${u}`
}

/** Whether a signature is enabled and has any content worth appending. */
export function hasSignatureContent(sig: SignatureFields | null | undefined): boolean {
  if (!sig || sig.enabled === false) return false
  return Boolean(
    sig.fullName || sig.title || sig.company || sig.phone || sig.email || sig.website || sig.logoUrl || sig.tagline,
  )
}

/** Render the signature as an HTML block (inline styles for email clients). */
export function renderSignatureHtml(sig: SignatureFields): string {
  const lines: string[] = []
  if (sig.fullName) lines.push(`<div style="font-weight:600;color:#111827;">${esc(sig.fullName)}</div>`)

  const roleParts = [sig.title, sig.company].filter(Boolean).map((s) => esc(s as string))
  if (roleParts.length) lines.push(`<div style="color:#4b5563;">${roleParts.join(", ")}</div>`)

  const contactParts: string[] = []
  if (sig.phone) contactParts.push(esc(sig.phone))
  if (sig.email) contactParts.push(`<a href="mailto:${esc(sig.email)}" style="color:#4f3df5;text-decoration:none;">${esc(sig.email)}</a>`)
  if (sig.website) {
    const url = normalizeUrl(sig.website)
    contactParts.push(`<a href="${esc(url)}" style="color:#4f3df5;text-decoration:none;">${esc(sig.website)}</a>`)
  }
  if (contactParts.length) lines.push(`<div style="color:#4b5563;">${contactParts.join(" &nbsp;•&nbsp; ")}</div>`)

  if (sig.tagline) lines.push(`<div style="color:#6b7280;font-size:12px;margin-top:4px;">${esc(sig.tagline)}</div>`)

  // Explicit width/height keep the logo the right size in clients that ignore
  // max-* CSS (notably Outlook) and let HiDPI clients render the 2× source
  // crisply. Fall back to max-* bounds when dimensions aren't known.
  const hasDims = Boolean(sig.logoWidth && sig.logoHeight)
  const logoDimAttrs = hasDims ? ` width="${sig.logoWidth}" height="${sig.logoHeight}"` : ""
  const logoDimStyle = hasDims
    ? `width:${sig.logoWidth}px;height:${sig.logoHeight}px;`
    : "max-height:56px;max-width:200px;"
  const logo = sig.logoUrl
    ? `<div style="margin-bottom:8px;"><img src="${esc(sig.logoUrl)}" alt="${esc(sig.company || sig.fullName || "Logo")}"${logoDimAttrs} style="display:block;${logoDimStyle}" /></div>`
    : ""

  return `<div style="margin-top:24px;padding-top:12px;border-top:1px solid #e5e7eb;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;">${logo}${lines.join("")}</div>`
}

/** Render the signature as plain text. */
export function renderSignatureText(sig: SignatureFields): string {
  const lines: string[] = ["", "--"]
  if (sig.fullName) lines.push(sig.fullName)
  const roleParts = [sig.title, sig.company].filter(Boolean)
  if (roleParts.length) lines.push(roleParts.join(", "))
  const contactParts = [sig.phone, sig.email, sig.website].filter(Boolean)
  if (contactParts.length) lines.push(contactParts.join(" | "))
  if (sig.tagline) lines.push(sig.tagline)
  return lines.join("\n")
}
