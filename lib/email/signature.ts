import "server-only"

import { eq } from "drizzle-orm"

import { db } from "@/lib/db"
import { emailSignatures } from "@/lib/db/schema"
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
  return row ?? null
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
