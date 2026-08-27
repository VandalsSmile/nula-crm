import "server-only"

import { eq } from "drizzle-orm"

import { db } from "@/lib/db"
import { emailSignatures } from "@/lib/db/schema"
import { normalizeStoredLogo } from "@/lib/email/logo-image"
import {
  hasSignatureContent,
  renderSignatureHtml,
  renderSignatureText,
} from "@/lib/email/signature-render"

export type SignatureRow = typeof emailSignatures.$inferSelect

export async function getUserSignature(userId: string): Promise<SignatureRow | null> {
  if (!userId) return null
  const [row] = await db
    .select()
    .from(emailSignatures)
    .where(eq(emailSignatures.userId, userId))
    .limit(1)
  return row ? ensureLogoNormalized(row) : null
}

/**
 * Ensure a logo's *stored image* has been physically shrunk to the small email
 * footprint. Logos uploaded before we resized the file (or ones only sized via
 * CSS/attributes) are re-downloaded, resized, and re-uploaded, then the row is
 * updated with the small URL + display dimensions. This is the reliable fix for
 * clients that ignore width/height: the file itself is now ~1 inch. One-time per
 * signature (guarded by logoNormalized); self-healing on any failure (the render
 * fallback still caps the logo by height).
 */
export async function ensureLogoNormalized(row: SignatureRow): Promise<SignatureRow> {
  if (!row.logoUrl || row.logoNormalized) return row
  try {
    const normalized = await normalizeStoredLogo(row.userId, row.logoUrl)
    if (!normalized) return row
    await db
      .update(emailSignatures)
      .set({
        logoUrl: normalized.url,
        logoWidth: normalized.width,
        logoHeight: normalized.height,
        logoNormalized: true,
      })
      .where(eq(emailSignatures.id, row.id))
    return {
      ...row,
      logoUrl: normalized.url,
      logoWidth: normalized.width,
      logoHeight: normalized.height,
      logoNormalized: true,
    }
  } catch {
    return row
  }
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
