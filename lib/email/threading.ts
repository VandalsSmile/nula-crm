import "server-only"

import crypto from "node:crypto"
import { and, eq } from "drizzle-orm"

import { db } from "@/lib/db"
import { activities, contacts, messageRoutes, messages } from "@/lib/db/schema"
import { randomId } from "@/lib/library-helpers"
import { INBOUND_EMAIL_DOMAIN } from "@/lib/email/mailbox"

export type MessageRouteRow = typeof messageRoutes.$inferSelect

/** A stable per-contact conversation id (one email thread per contact). */
export function threadIdForContact(contactId: string): string {
  return `thr_${contactId}`
}

/** The Reply-To address a contact replies to so we can capture the reply. */
export function replyAddressForToken(token: string): string {
  return token ? `reply+${token}@${INBOUND_EMAIL_DOMAIN}` : ""
}

/** Generate an RFC Message-ID we control, so replies can reference it. */
export function generateMessageId(): string {
  return `<${crypto.randomBytes(16).toString("hex")}@${INBOUND_EMAIL_DOMAIN}>`
}

/**
 * Get (or create) the reply route for a contact. One route per (workspace,
 * contact) — every reply from that contact routes to the same conversation.
 */
export async function ensureReplyRoute(
  workspaceId: string,
  contactId: string,
  createdBy: string,
): Promise<MessageRouteRow> {
  const [existing] = await db
    .select()
    .from(messageRoutes)
    .where(and(eq(messageRoutes.userId, workspaceId), eq(messageRoutes.contactId, contactId)))
    .limit(1)
  if (existing) return existing

  const [created] = await db
    .insert(messageRoutes)
    .values({
      id: randomId("mr"),
      userId: workspaceId,
      contactId,
      token: crypto.randomBytes(12).toString("hex"),
      threadId: threadIdForContact(contactId),
      createdBy,
    })
    .returning()
  return created!
}

export async function resolveReplyRoute(token: string): Promise<MessageRouteRow | null> {
  const t = token.trim()
  if (!t) return null
  const [row] = await db.select().from(messageRoutes).where(eq(messageRoutes.token, t)).limit(1)
  return row ?? null
}

export type ReplyPayload = {
  fromEmail: string
  subject?: string
  body: string
  externalId?: string
  messageId?: string
  inReplyTo?: string
  references?: string
}

export type ReplyLogResult =
  | { status: "logged"; contactId: string }
  | { status: "skipped"; reason: string }

/**
 * Capture a contact's reply that arrived at reply+{token}@inbox… and thread it
 * onto the contact's conversation as an inbound message.
 */
export async function logReplyToRoute(
  route: MessageRouteRow,
  payload: ReplyPayload,
): Promise<ReplyLogResult> {
  const workspaceId = route.userId
  const from = payload.fromEmail.trim().toLowerCase()
  if (!from) return { status: "skipped", reason: "missing sender" }

  // Idempotency on the provider message id.
  const externalId = payload.externalId?.trim() ?? ""
  if (externalId) {
    const [dupe] = await db
      .select({ id: messages.id })
      .from(messages)
      .where(and(eq(messages.userId, workspaceId), eq(messages.externalId, externalId)))
      .limit(1)
    if (dupe) return { status: "skipped", reason: "duplicate" }
  }

  const [contact] = await db
    .select({ id: contacts.id })
    .from(contacts)
    .where(eq(contacts.id, route.contactId))
    .limit(1)
  if (!contact) return { status: "skipped", reason: "contact not found" }

  const subject = payload.subject?.trim() ?? ""
  await db.insert(messages).values({
    id: randomId("msg"),
    userId: workspaceId,
    contactId: route.contactId,
    direction: "inbound",
    channel: "email",
    subject,
    body: payload.body,
    status: "received",
    externalId,
    fromEmail: from,
    toEmail: replyAddressForToken(route.token),
    messageId: payload.messageId?.trim() ?? "",
    inReplyTo: payload.inReplyTo?.trim() ?? "",
    referencesHeader: payload.references?.trim() ?? "",
    threadId: route.threadId || threadIdForContact(route.contactId),
  })

  await db
    .update(contacts)
    .set({ lastActivityAt: new Date() })
    .where(eq(contacts.id, route.contactId))

  await db.insert(activities).values({
    id: randomId("a"),
    userId: workspaceId,
    type: "email_received",
    message: subject ? `Received reply: "${subject}"` : "Received email reply",
    contactId: route.contactId,
    actorId: "mailbox",
  })

  return { status: "logged", contactId: route.contactId }
}
