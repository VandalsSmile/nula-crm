import "server-only"

import { and, eq, or, sql } from "drizzle-orm"
import { z } from "zod"

import { db } from "@/lib/db"
import { activities, contacts, messages } from "@/lib/db/schema"
import { workspaceUserIdMatches, getWorkspaceScopeIds } from "@/lib/workspace-scope"
import { sharedWorkspaceId } from "@/lib/workspace-scope"
import { randomId } from "@/lib/library-helpers"

export const inboundMessageSchema = z.object({
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  channel: z.enum(["email", "sms"]).optional().default("email"),
  subject: z.string().optional(),
  body: z.string().min(1),
  name: z.string().optional(),
  workspaceId: z.string().optional(),
})

export type InboundMessagePayload = z.infer<typeof inboundMessageSchema>

function normalizePhone(phone?: string) {
  return phone?.replace(/\D/g, "") ?? ""
}

export function resolveMessageWorkspaceId(payloadWorkspaceId?: string): string {
  const shared = sharedWorkspaceId()
  if (shared) return shared
  if (payloadWorkspaceId?.trim()) return payloadWorkspaceId.trim()
  throw new Error("workspaceId is required when NULA_SHARED_WORKSPACE_ID is not set")
}

async function findOrCreateContact(
  workspaceId: string,
  scopeIds: string[],
  payload: InboundMessagePayload,
) {
  const email = payload.email?.trim().toLowerCase() ?? ""
  const phone = normalizePhone(payload.phone)

  const conditions = []
  if (email) conditions.push(sql`lower(${contacts.email}) = ${email}`)
  if (phone.length >= 7) {
    conditions.push(sql`regexp_replace(${contacts.phone}, '[^0-9]', '', 'g') = ${phone}`)
  }

  if (conditions.length > 0) {
    const [existing] = await db
      .select()
      .from(contacts)
      .where(and(workspaceUserIdMatches(contacts.userId, scopeIds), or(...conditions)))
      .limit(1)
    if (existing) return existing
  }

  const firstName = payload.name?.trim() || email || payload.phone?.trim() || "Website visitor"
  const [created] = await db
    .insert(contacts)
    .values({
      id: randomId("ct"),
      userId: workspaceId,
      firstName,
      name: firstName,
      email,
      phone: payload.phone?.trim() ?? "",
      source: "inbox",
      lifecycleStage: "New Lead",
      lastActivityAt: new Date(),
    })
    .returning()
  return created
}

/** Ingest an inbound customer message, matching or creating the contact. */
export async function ingestInboundMessage(raw: unknown) {
  const payload = inboundMessageSchema.parse(raw)
  const workspaceId = resolveMessageWorkspaceId(payload.workspaceId)
  const scopeIds = await getWorkspaceScopeIds(workspaceId)

  const contact = await findOrCreateContact(workspaceId, scopeIds, payload)

  const [message] = await db
    .insert(messages)
    .values({
      id: randomId("msg"),
      userId: workspaceId,
      contactId: contact.id,
      direction: "inbound",
      channel: payload.channel,
      subject: payload.subject ?? "",
      body: payload.body,
      status: "received",
    })
    .returning()

  await db
    .update(contacts)
    .set({ lastActivityAt: new Date() })
    .where(eq(contacts.id, contact.id))

  await db.insert(activities).values({
    id: randomId("a"),
    userId: workspaceId,
    type: payload.channel === "sms" ? "sms_sent" : "email_opened",
    message: `Inbound ${payload.channel} message received`,
    contactId: contact.id,
    actorId: "inbox",
  })

  return { messageId: message.id, contactId: contact.id }
}
