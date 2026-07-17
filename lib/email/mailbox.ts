import "server-only"

import { and, eq, sql } from "drizzle-orm"

import { db } from "@/lib/db"
import { activities, contacts, emailConnections, messages } from "@/lib/db/schema"
import { getWorkspaceScopeIds, workspaceUserIdMatches } from "@/lib/workspace-scope"
import { randomId } from "@/lib/library-helpers"

export const INBOUND_EMAIL_DOMAIN =
  process.env.INBOUND_EMAIL_DOMAIN?.trim() || "inbox.nulacrm.ai"

/** The per-user dropbox address a user BCCs / forwards mail to. */
export function dropboxAddressForToken(token: string): string {
  return token ? `me+${token}@${INBOUND_EMAIL_DOMAIN}` : ""
}

export type EmailConnectionRow = typeof emailConnections.$inferSelect

/** Resolve a user's email connection (and workspace) from its address token. */
export async function resolveEmailConnectionByToken(
  token: string,
): Promise<EmailConnectionRow | null> {
  if (!token.trim()) return null
  const [row] = await db
    .select()
    .from(emailConnections)
    .where(eq(emailConnections.token, token.trim()))
    .limit(1)
  return row ?? null
}

function ownedList(connection: EmailConnectionRow): string[] {
  return connection.ownedEmails
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
}

export type MailboxEmail = {
  fromEmail: string
  fromName?: string
  recipientEmails: string[]
  subject?: string
  body: string
  externalId?: string
}

export type MailboxLogResult =
  | { status: "logged"; contactId: string; direction: "inbound" | "outbound" }
  | { status: "skipped"; reason: string }

/**
 * Log a BCC'd / forwarded email against the matching contact for the connected
 * user. Direction is derived from whether the sender is one of the user's own
 * addresses. Unlike the lead pipeline, this does not score/tag — it just records
 * the correspondence on the contact's timeline (and Inbox).
 */
export async function logMailboxEmail(
  payload: MailboxEmail,
  connection: EmailConnectionRow,
): Promise<MailboxLogResult> {
  const workspaceId = connection.workspaceId
  const owned = ownedList(connection)
  const from = payload.fromEmail.trim().toLowerCase()
  if (!from) return { status: "skipped", reason: "missing sender" }

  const dropbox = dropboxAddressForToken(connection.token).toLowerCase()
  const isDropbox = (e: string) => e === dropbox || e.includes(`+${connection.token}@`)

  const direction: "inbound" | "outbound" = owned.includes(from) ? "outbound" : "inbound"

  // The counterparty is the contact side of the conversation.
  let counterparty = ""
  if (direction === "outbound") {
    counterparty =
      payload.recipientEmails
        .map((e) => e.trim().toLowerCase())
        .find((e) => e && !owned.includes(e) && !isDropbox(e)) ?? ""
  } else {
    counterparty = from
  }
  if (!counterparty) return { status: "skipped", reason: "no counterparty address" }

  // Idempotency: skip if we've already logged this provider message.
  const externalId = payload.externalId?.trim() ?? ""
  if (externalId) {
    const [dupe] = await db
      .select({ id: messages.id })
      .from(messages)
      .where(and(eq(messages.userId, workspaceId), eq(messages.externalId, externalId)))
      .limit(1)
    if (dupe) return { status: "skipped", reason: "duplicate" }
  }

  const scopeIds = await getWorkspaceScopeIds(workspaceId)
  const [existing] = await db
    .select()
    .from(contacts)
    .where(
      and(
        workspaceUserIdMatches(contacts.userId, scopeIds),
        sql`lower(${contacts.email}) = ${counterparty}`,
      ),
    )
    .limit(1)

  let contact = existing
  if (!contact) {
    if (connection.mode !== "all") {
      return { status: "skipped", reason: "no matching contact" }
    }
    const firstName = counterparty.split("@")[0] || counterparty
    const [created] = await db
      .insert(contacts)
      .values({
        id: randomId("ct"),
        userId: workspaceId,
        firstName,
        name: firstName,
        email: counterparty,
        source: "email-log",
        lifecycleStage: "New Lead",
        ownerId: connection.userId,
        lastActivityAt: new Date(),
      })
      .returning()
    contact = created
  }

  const subject = payload.subject?.trim() ?? ""
  await db.insert(messages).values({
    id: randomId("msg"),
    userId: workspaceId,
    contactId: contact.id,
    direction,
    channel: "email",
    subject,
    body: payload.body,
    status: "logged",
    externalId,
    fromEmail: from,
    toEmail: counterparty,
  })

  await db.update(contacts).set({ lastActivityAt: new Date() }).where(eq(contacts.id, contact.id))

  await db.insert(activities).values({
    id: randomId("a"),
    userId: workspaceId,
    type: direction === "outbound" ? "email_sent" : "email_received",
    message: subject
      ? `${direction === "outbound" ? "Sent" : "Received"} email: "${subject}"`
      : `${direction === "outbound" ? "Sent" : "Received"} email`,
    contactId: contact.id,
    // Outbound is attributable to the connected user; inbound comes from outside.
    actorId: direction === "outbound" ? connection.userId : "mailbox",
  })

  return { status: "logged", contactId: contact.id, direction }
}
