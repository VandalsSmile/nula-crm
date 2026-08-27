import "server-only"

import { eq } from "drizzle-orm"
import sharp from "sharp"

import { db } from "@/lib/db"
import { emailSignatures } from "@/lib/db/schema"
import {
  fitLogoDimensions,
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
  return row ? ensureLogoDimensions(row) : null
}

/**
 * Backfill the stored display size for a logo uploaded before we recorded
 * dimensions. We read the image's real size and fit it into the enforced box,
 * then persist so the email can pin explicit width/height (and it's a one-time
 * cost per signature). Self-healing: any failure just leaves dims unset, and the
 * renderer still caps the logo by height.
 */
export async function ensureLogoDimensions(row: SignatureRow): Promise<SignatureRow> {
  if (!row.logoUrl || (row.logoWidth > 0 && row.logoHeight > 0)) return row
  try {
    const res = await fetch(row.logoUrl)
    if (!res.ok) return row
    const buf = Buffer.from(await res.arrayBuffer())
    const meta = await sharp(buf).metadata()
    const { width, height } = fitLogoDimensions(meta.width || 0, meta.height || 0)
    if (!width || !height) return row
    await db
      .update(emailSignatures)
      .set({ logoWidth: width, logoHeight: height })
      .where(eq(emailSignatures.id, row.id))
    return { ...row, logoWidth: width, logoHeight: height }
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
