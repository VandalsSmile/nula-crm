"use server"

import { and, eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"

import { db } from "@/lib/db"
import { activities, contacts, deals } from "@/lib/db/schema"
import { getActingUser, workspaceUserIdMatches } from "@/lib/auth-helpers"
import { randomId } from "@/lib/library-helpers"
import { mapDeal } from "@/lib/mappers"
import type { DealStage } from "@/lib/crm-types"
import { APP_ROUTES } from "@/lib/routes"

export type DealInput = {
  contactId: string
  title: string
  offerInterest?: string
  stage?: DealStage
  estimatedValueCents?: number
  probability?: number
  nextStep?: string
  closeDate?: string | null
}

async function assertContactAccess(contactId: string, scopeIds: string[]) {
  const [row] = await db
    .select({ id: contacts.id, name: contacts.name, firstName: contacts.firstName, lastName: contacts.lastName })
    .from(contacts)
    .where(and(eq(contacts.id, contactId), workspaceUserIdMatches(contacts.userId, scopeIds)))
    .limit(1)
  if (!row) throw new Error("Contact not found")
  return row
}

export async function createDeal(input: DealInput) {
  const { user, workspaceId, scopeIds } = await getActingUser()
  const title = input.title.trim()
  if (!title) throw new Error("Deal title is required")

  const contact = await assertContactAccess(input.contactId, scopeIds)
  const contactName = [contact.firstName, contact.lastName].filter(Boolean).join(" ") || contact.name

  const [row] = await db
    .insert(deals)
    .values({
      id: randomId("deal"),
      userId: workspaceId,
      contactId: input.contactId,
      title,
      offerInterest: input.offerInterest?.trim() ?? "",
      stage: input.stage ?? "New Lead",
      estimatedValueCents: input.estimatedValueCents ?? 0,
      probability: input.probability ?? 0,
      nextStep: input.nextStep?.trim() ?? "",
      ownerId: user.id,
      closeDate: input.closeDate ? new Date(input.closeDate) : null,
    })
    .returning()

  await db.insert(activities).values({
    id: randomId("a"),
    userId: workspaceId,
    type: "created",
    message: `created deal "${title}"`,
    contactId: input.contactId,
    actorId: user.id,
  })

  revalidatePath(`${APP_ROUTES.contacts}/${input.contactId}`)
  return mapDeal(row, contactName)
}

export async function updateDeal(dealId: string, input: Partial<DealInput>) {
  const { scopeIds } = await getActingUser()

  const [existing] = await db
    .select()
    .from(deals)
    .where(and(eq(deals.id, dealId), workspaceUserIdMatches(deals.userId, scopeIds)))
    .limit(1)
  if (!existing) throw new Error("Deal not found")

  const patch: Record<string, string | number | Date | null> = { updatedAt: new Date() }
  if (input.title !== undefined) patch.title = input.title.trim()
  if (input.offerInterest !== undefined) patch.offerInterest = input.offerInterest.trim()
  if (input.stage !== undefined) patch.stage = input.stage
  if (input.estimatedValueCents !== undefined) patch.estimatedValueCents = input.estimatedValueCents
  if (input.probability !== undefined) patch.probability = input.probability
  if (input.nextStep !== undefined) patch.nextStep = input.nextStep.trim()
  if (input.closeDate !== undefined) patch.closeDate = input.closeDate ? new Date(input.closeDate) : null

  const [row] = await db.update(deals).set(patch).where(eq(deals.id, dealId)).returning()

  revalidatePath(`${APP_ROUTES.contacts}/${existing.contactId}`)
  const contact = await assertContactAccess(existing.contactId, scopeIds)
  const contactName = [contact.firstName, contact.lastName].filter(Boolean).join(" ") || contact.name
  return mapDeal(row, contactName)
}

export async function deleteDeal(dealId: string) {
  const { scopeIds } = await getActingUser()

  const [existing] = await db
    .select()
    .from(deals)
    .where(and(eq(deals.id, dealId), workspaceUserIdMatches(deals.userId, scopeIds)))
    .limit(1)
  if (!existing) throw new Error("Deal not found")

  await db.delete(deals).where(eq(deals.id, dealId))
  revalidatePath(`${APP_ROUTES.contacts}/${existing.contactId}`)
  return { ok: true }
}
