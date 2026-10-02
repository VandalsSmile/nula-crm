"use server"

import { and, eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"

import { db } from "@/lib/db"
import { activities, contacts, messages } from "@/lib/db/schema"
import { requireRole, workspaceUserIdMatches } from "@/lib/auth-helpers"
import { requireActiveWorkspace } from "@/lib/entitlements"
import { getMessagesForContact } from "@/lib/queries"
import { randomId } from "@/lib/library-helpers"
import { getWorkspaceEmailConfig, sendEmailViaResend } from "@/lib/email/sender"
import { parseEmailList } from "@/lib/email/addresses"
import { htmlToPlainText, sanitizeEmailHtml } from "@/lib/email/sanitize"
import { appendSignature } from "@/lib/email/signature"
import {
  ensureReplyRoute,
  generateMessageId,
  replyAddressForToken,
  threadIdForContact,
} from "@/lib/email/threading"
import { APP_ROUTES } from "@/lib/routes"
import type { Message } from "@/lib/crm-types"

/** Escape plain-text so it's safe to drop into the HTML email body. */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
}

export async function loadConversation(contactId: string): Promise<Message[]> {
  await requireRole("Admin", "Member")
  return getMessagesForContact(contactId)
}

export async function sendMessage(input: {
  contactId: string
  channel: "email" | "sms"
  subject?: string
  body: string
  cc?: string[]
  bcc?: string[]
}): Promise<{ ok: boolean; status: string }> {
  const { user, workspaceId, scopeIds } = await requireRole("Admin", "Member")
  await requireActiveWorkspace(workspaceId)

  // The composer can submit rich HTML or plain text. Derive a plain-text version
  // for validation + the email's text alternative, and keep sanitized HTML for
  // sending and storage so the conversation can show formatting.
  const rawBody = input.body ?? ""
  const isHtml = /<[a-z][\s\S]*>/i.test(rawBody)
  const plainBody = (isHtml ? htmlToPlainText(rawBody) : rawBody).trim()
  if (!plainBody) throw new Error("Message body is required")
  const safeHtml = isHtml
    ? sanitizeEmailHtml(rawBody)
    : `<p>${escapeHtml(plainBody).replace(/\n/g, "<br>")}</p>`
  // What we persist on the message row (HTML keeps formatting; text stays text).
  const storedBody = isHtml ? safeHtml : plainBody

  // Normalize Cc/Bcc to valid, deduped addresses (email channel only).
  const ccList = input.channel === "email" ? parseEmailList((input.cc ?? []).join(",")) : []
  const bccList = input.channel === "email" ? parseEmailList((input.bcc ?? []).join(",")) : []

  const [contact] = await db
    .select()
    .from(contacts)
    .where(and(eq(contacts.id, input.contactId), workspaceUserIdMatches(contacts.userId, scopeIds)))
    .limit(1)
  if (!contact) throw new Error("Contact not found")

  let status = "queued"
  let messageId = ""
  if (input.channel === "email") {
    if (!contact.email) {
      status = "skipped"
    } else {
      const config = await getWorkspaceEmailConfig(workspaceId)
      if (!config.apiKey) {
        status = "queued"
      } else {
        // Route replies back to us: the contact replies to reply+{token}@… which
        // lands on /api/inbound/email and is threaded onto this conversation —
        // capturing the full two-way thread without any mailbox access.
        const route = await ensureReplyRoute(workspaceId, input.contactId, user.id)
        messageId = generateMessageId()
        // Append the author's saved signature to the email they send.
        const { html, text } = await appendSignature(user.id, safeHtml, plainBody)
        const result = await sendEmailViaResend(config, {
          to: contact.email,
          subject: input.subject || "Message from Nula",
          html,
          text,
          replyTo: replyAddressForToken(route.token),
          cc: ccList,
          bcc: bccList,
          headers: { "Message-ID": messageId },
        })
        status = result.ok ? "sent" : "failed"
      }
    }
  } else {
    // No SMS provider configured yet.
    status = "skipped"
  }

  const messageRowId = randomId("msg")
  await db.insert(messages).values({
    id: messageRowId,
    userId: workspaceId,
    contactId: input.contactId,
    direction: "outbound",
    channel: input.channel,
    subject: input.subject ?? "",
    body: storedBody,
    status,
    messageId,
    cc: ccList.join(", "),
    bcc: bccList.join(", "),
    threadId: threadIdForContact(input.contactId),
  })

  await db
    .update(contacts)
    .set({ lastContactedAt: new Date(), lastActivityAt: new Date() })
    .where(eq(contacts.id, input.contactId))

  await db.insert(activities).values({
    id: randomId("a"),
    userId: workspaceId,
    type: input.channel === "sms" ? "sms_sent" : "email_sent",
    message: input.subject
      ? `Sent email: "${input.subject}"`
      : `Sent ${input.channel} message`,
    contactId: input.contactId,
    actorId: user.id,
    // Link the "Sent email" activity to the message so the feed can open it.
    ...(input.channel === "email" ? { refType: "message", refId: messageRowId } : {}),
  })

  revalidatePath(APP_ROUTES.inbox)
  revalidatePath(`${APP_ROUTES.contacts}/${input.contactId}`)
  return { ok: true, status }
}
