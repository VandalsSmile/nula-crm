import "server-only"

import crypto from "node:crypto"
import { and, eq } from "drizzle-orm"

import { db } from "@/lib/db"
import { activities, contacts, messageRoutes, messages, user as userTable } from "@/lib/db/schema"
import { randomId } from "@/lib/library-helpers"
import { contactFullName } from "@/lib/crm-types"
import { getWorkspaceEmailConfig, sendEmailViaResend } from "@/lib/email/sender"
import { INBOUND_EMAIL_DOMAIN } from "@/lib/email/mailbox"

export type MessageRouteRow = typeof messageRoutes.$inferSelect

/** App origin for building "view it" links in notification emails. */
function appOrigin(): string {
  const explicit = process.env.NEXT_PUBLIC_APP_URL?.trim() || process.env.BETTER_AUTH_URL?.trim()
  return (explicit || "https://www.nulacrm.ai").replace(/\/$/, "")
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

/**
 * Notify the user who owns the conversation that a contact replied, with a link
 * to view it. Best-effort — a send failure must never break reply ingestion.
 */
async function notifyUserOfReply(params: {
  workspaceId: string
  toUserId: string
  contactId: string
  contactName: string
  subject: string
  body: string
}): Promise<void> {
  try {
    if (!params.toUserId) return
    const [recipient] = await db
      .select({ email: userTable.email, name: userTable.name })
      .from(userTable)
      .where(eq(userTable.id, params.toUserId))
      .limit(1)
    const to = recipient?.email?.trim()
    if (!to) return

    const config = await getWorkspaceEmailConfig(params.workspaceId)
    if (!config.apiKey) {
      console.log(`[reply-notify] skipped (no email config) for ${to}`)
      return
    }

    const link = `${appOrigin()}/app/contacts/${params.contactId}`
    const subjectLine = params.subject.trim() || "(no subject)"
    const snippet = params.body.trim().slice(0, 300)
    const firstName = (recipient?.name ?? "").split(/\s+/)[0] || "there"

    const html = `
      <div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;color:#1c1630;">
        <p>Hi ${escapeHtml(firstName)},</p>
        <p><strong>${escapeHtml(params.contactName)}</strong> replied to your email.</p>
        <p style="margin:16px 0;padding:12px 16px;border-left:3px solid #4f3df5;background:#faf9fc;">
          <span style="color:#6b7280;">Re: ${escapeHtml(subjectLine)}</span><br/>
          ${escapeHtml(snippet)}${params.body.trim().length > 300 ? "…" : ""}
        </p>
        <p><a href="${link}" style="display:inline-block;background:#4f3df5;color:#fff;text-decoration:none;padding:10px 18px;border-radius:9999px;">View the reply</a></p>
        <p style="color:#6b7280;font-size:12px;margin-top:16px;">You're receiving this because you emailed ${escapeHtml(params.contactName)} from Nula.</p>
      </div>`
    const text = `Hi ${firstName},\n\n${params.contactName} replied to your email.\n\nRe: ${subjectLine}\n${snippet}${params.body.trim().length > 300 ? "…" : ""}\n\nView the reply: ${link}`

    await sendEmailViaResend(config, {
      to,
      subject: `New reply from ${params.contactName}`,
      html,
      text,
    })
  } catch (err) {
    console.error("[reply-notify] failed", err)
  }
}

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
    .select({
      id: contacts.id,
      firstName: contacts.firstName,
      lastName: contacts.lastName,
      name: contacts.name,
      email: contacts.email,
    })
    .from(contacts)
    .where(eq(contacts.id, route.contactId))
    .limit(1)
  if (!contact) return { status: "skipped", reason: "contact not found" }

  const contactName =
    contactFullName(contact.firstName, contact.lastName) || contact.name || contact.email || from

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

  // Best-effort: email the user who owns this conversation with a link to view it.
  await notifyUserOfReply({
    workspaceId,
    toUserId: route.createdBy,
    contactId: route.contactId,
    contactName,
    subject,
    body: payload.body,
  })

  return { status: "logged", contactId: route.contactId }
}
