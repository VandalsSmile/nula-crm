import "server-only"

import { eq } from "drizzle-orm"

import { db } from "@/lib/db"
import { contacts } from "@/lib/db/schema"
import { randomId } from "@/lib/library-helpers"

export function appBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    process.env.BETTER_AUTH_URL?.replace(/\/$/, "") ||
    "https://www.nulacrm.ai"
  )
}

/** Human-facing confirm page. */
export function unsubscribeUrl(token: string): string {
  return token ? `${appBaseUrl()}/unsubscribe/${token}` : ""
}

/** RFC 8058 one-click endpoint used in the List-Unsubscribe header (POST). */
export function unsubscribeApiUrl(token: string): string {
  return token ? `${appBaseUrl()}/api/unsubscribe/${token}` : ""
}

/**
 * Get (or lazily create + persist) a contact's opaque unsubscribe token. Called
 * when a campaign email is sent so every recipient gets a working one-click
 * unsubscribe link.
 */
export async function ensureUnsubscribeToken(contactId: string, existing?: string): Promise<string> {
  const current = existing?.trim() ?? ""
  if (current) return current
  const token = randomId("unsub")
  await db.update(contacts).set({ unsubscribeToken: token }).where(eq(contacts.id, contactId))
  return token
}

export type UnsubscribeTarget = { email: string; name: string; optedOut: boolean } | null

/** Look up the contact behind an unsubscribe token (for the public page). */
export async function resolveUnsubscribeTarget(token: string): Promise<UnsubscribeTarget> {
  const t = token.trim()
  if (!t) return null
  const [row] = await db
    .select({ email: contacts.email, name: contacts.name, optInStatus: contacts.optInStatus })
    .from(contacts)
    .where(eq(contacts.unsubscribeToken, t))
    .limit(1)
  if (!row) return null
  return { email: row.email, name: row.name, optedOut: row.optInStatus === "opted_out" }
}

/**
 * Opt a contact in/out by unsubscribe token. Returns true when a matching
 * contact was updated. No auth: the opaque token is the capability.
 */
export async function setOptOutByToken(token: string, optOut: boolean): Promise<boolean> {
  const t = token.trim()
  if (!t) return false
  const res = await db
    .update(contacts)
    .set({ optInStatus: optOut ? "opted_out" : "subscribed" })
    .where(eq(contacts.unsubscribeToken, t))
    .returning({ id: contacts.id })
  return res.length > 0
}
