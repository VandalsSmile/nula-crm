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
import {
  ensureReplyRoute,
  generateMessageId,
  replyAddressForToken,
  threadIdForContact,
} from "@/lib/email/threading"
import { APP_ROUTES } from "@/lib/routes"
import type { Message } from "@/lib/crm-types"

export async function loadConversation(contactId: string): Promise<Message[]> {
  await requireRole("Admin", "Member")
  return getMessagesForContact(contactId)
}

export async function sendMessage(input: {
  contactId: string
  channel: "email" | "sms"
  subject?: string
  body: string
}): Promise<{ ok: boolean; status: string }> {
  const { user, workspaceId, scopeIds } = await requireRole("Admin", "Member")
  await requireActiveWorkspace(workspaceId)
  const body = input.body?.trim()
  if (!body) throw new Error("Message body is required")

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
        const result = await sendEmailViaResend(config, {
          to: contact.email,
          subject: input.subject || "Message from Nula",
          html: `<p>${body.replace(/\n/g, "<br>")}</p>`,
          text: body,
          replyTo: replyAddressForToken(route.token),
          headers: { "Message-ID": messageId },
        })
        status = result.ok ? "sent" : "failed"
      }
    }
  } else {
    // No SMS provider configured yet.
    status = "skipped"
  }

  await db.insert(messages).values({
    id: randomId("msg"),
    userId: workspaceId,
    contactId: input.contactId,
    direction: "outbound",
    channel: input.channel,
    subject: input.subject ?? "",
    body,
    status,
    messageId,
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
  })

  revalidatePath(APP_ROUTES.inbox)
  revalidatePath(`${APP_ROUTES.contacts}/${input.contactId}`)
  return { ok: true, status }
}
