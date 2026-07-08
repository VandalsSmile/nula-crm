"use server"

import { and, eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"

import { db } from "@/lib/db"
import { activities, contacts, messages } from "@/lib/db/schema"
import { requireRole, workspaceUserIdMatches } from "@/lib/auth-helpers"
import { getMessagesForContact } from "@/lib/queries"
import { randomId } from "@/lib/library-helpers"
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
  const body = input.body?.trim()
  if (!body) throw new Error("Message body is required")

  const [contact] = await db
    .select()
    .from(contacts)
    .where(and(eq(contacts.id, input.contactId), workspaceUserIdMatches(contacts.userId, scopeIds)))
    .limit(1)
  if (!contact) throw new Error("Contact not found")

  let status = "queued"
  if (input.channel === "email") {
    if (!contact.email) {
      status = "skipped"
    } else {
      const key = process.env.RESEND_API_KEY?.trim()
      if (!key) {
        status = "queued"
      } else {
        const from = process.env.RESEND_FROM_EMAIL?.trim() || "Nula CRM <info@nulacrm.ai>"
        try {
          const res = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              from,
              to: contact.email,
              subject: input.subject || "Message from Nula",
              html: `<p>${body.replace(/\n/g, "<br>")}</p>`,
              text: body,
            }),
          })
          status = res.ok ? "sent" : "failed"
        } catch {
          status = "failed"
        }
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
  })

  await db
    .update(contacts)
    .set({ lastContactedAt: new Date(), lastActivityAt: new Date() })
    .where(eq(contacts.id, input.contactId))

  await db.insert(activities).values({
    id: randomId("a"),
    userId: workspaceId,
    type: input.channel === "sms" ? "sms_sent" : "note_added",
    message: `Sent ${input.channel} message`,
    contactId: input.contactId,
    actorId: user.id,
  })

  revalidatePath(APP_ROUTES.inbox)
  revalidatePath(`${APP_ROUTES.contacts}/${input.contactId}`)
  return { ok: true, status }
}
