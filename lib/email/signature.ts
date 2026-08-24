import "server-only"

import { eq } from "drizzle-orm"

import { db } from "@/lib/db"
import { emailSignatures } from "@/lib/db/schema"

export type SignatureRow = typeof emailSignatures.$inferSelect

export async function getUserSignature(userId: string): Promise<SignatureRow | null> {
  if (!userId) return null
  const [row] = await db
    .select()
    .from(emailSignatures)
    .where(eq(emailSignatures.userId, userId))
    .limit(1)
  return row ?? null
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

/** Whether a signature has any content worth appending. */
export function hasSignatureContent(sig: SignatureRow | null): boolean {
  if (!sig || !sig.enabled) return false
  return Boolean(
    sig.fullName || sig.title || sig.company || sig.phone || sig.email || sig.website || sig.logoUrl || sig.tagline,
  )
}

/** Render the signature as an HTML block (inline styles for email clients). */
export function renderSignatureHtml(sig: SignatureRow): string {
  const lines: string[] = []
  if (sig.fullName) lines.push(`<div style="font-weight:600;color:#111827;">${esc(sig.fullName)}</div>`)

  const roleParts = [sig.title, sig.company].filter(Boolean).map(esc)
  if (roleParts.length) {
    lines.push(`<div style="color:#4b5563;">${roleParts.join(", ")}</div>`)
  }

  const contactParts: string[] = []
  if (sig.phone) contactParts.push(esc(sig.phone))
  if (sig.email) contactParts.push(`<a href="mailto:${esc(sig.email)}" style="color:#4f3df5;text-decoration:none;">${esc(sig.email)}</a>`)
  if (sig.website) {
    const url = normalizeUrl(sig.website)
    contactParts.push(`<a href="${esc(url)}" style="color:#4f3df5;text-decoration:none;">${esc(sig.website)}</a>`)
  }
  if (contactParts.length) {
    lines.push(`<div style="color:#4b5563;">${contactParts.join(" &nbsp;•&nbsp; ")}</div>`)
  }

  if (sig.tagline) lines.push(`<div style="color:#6b7280;font-size:12px;margin-top:4px;">${esc(sig.tagline)}</div>`)

  const logo = sig.logoUrl
    ? `<div style="margin-bottom:8px;"><img src="${esc(sig.logoUrl)}" alt="${esc(sig.company || sig.fullName || "Logo")}" style="max-height:56px;max-width:200px;" /></div>`
    : ""

  return `<div style="margin-top:24px;padding-top:12px;border-top:1px solid #e5e7eb;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;">${logo}${lines.join("")}</div>`
}

/** Render the signature as plain text. */
export function renderSignatureText(sig: SignatureRow): string {
  const lines: string[] = ["", "--"]
  if (sig.fullName) lines.push(sig.fullName)
  const roleParts = [sig.title, sig.company].filter(Boolean)
  if (roleParts.length) lines.push(roleParts.join(", "))
  const contactParts = [sig.phone, sig.email, sig.website].filter(Boolean)
  if (contactParts.length) lines.push(contactParts.join(" | "))
  if (sig.tagline) lines.push(sig.tagline)
  return lines.join("\n")
}

/** Append the user's signature to an email body (html + text). No-op if empty. */
export async function appendSignature(
  userId: string,
  html: string,
  text: string,
): Promise<{ html: string; text: string }> {
  const sig = await getUserSignature(userId)
  if (!hasSignatureContent(sig)) return { html, text }
  return {
    html: `${html}${renderSignatureHtml(sig!)}`,
    text: `${text}${renderSignatureText(sig!)}`,
  }
}
