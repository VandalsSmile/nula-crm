"use server"

import { and, eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"

import { db } from "@/lib/db"
import { activities, contactGroups, contactTags, contacts, deals } from "@/lib/db/schema"
import { getActingUser, workspaceUserIdMatches } from "@/lib/auth-helpers"
import { randomId } from "@/lib/library-helpers"
import { mapContact } from "@/lib/mappers"
import type { Contact, LifecycleStage } from "@/lib/crm-types"
import { formatRevenue } from "@/lib/crm-types"
import { processPurchaseAutomations } from "@/lib/automations/engine"
import { processLeadIntake } from "@/lib/leads/intake"
import { APP_ROUTES } from "@/lib/routes"

export type ContactInput = {
  firstName: string
  lastName?: string
  email?: string
  phone?: string
  address?: string
  city?: string
  state?: string
  zip?: string
  source?: string
  lifecycleStage?: LifecycleStage
  notes?: string
  productsPurchased?: string
  leadScore?: number
}

export async function createContact(input: ContactInput): Promise<Contact> {
  const { user, workspaceId } = await getActingUser()
  if (!input.firstName?.trim()) throw new Error("First name is required")

  const firstName = input.firstName.trim()
  const lastName = input.lastName?.trim() ?? ""

  const [row] = await db
    .insert(contacts)
    .values({
      id: randomId("ct"),
      userId: workspaceId,
      firstName,
      lastName,
      name: [firstName, lastName].filter(Boolean).join(" "),
      email: input.email ?? "",
      phone: input.phone ?? "",
      address: input.address ?? "",
      city: input.city ?? "",
      state: input.state ?? "",
      zip: input.zip ?? "",
      source: input.source ?? "manual",
      lifecycleStage: input.lifecycleStage ?? "New Lead",
      notes: input.notes ?? "",
      productsPurchased: input.productsPurchased ?? "",
      leadScore: input.leadScore ?? 0,
      lastActivityAt: new Date(),
    })
    .returning()

  await db.insert(activities).values({
    id: randomId("a"),
    userId: workspaceId,
    type: "created",
    message: `added contact ${firstName} ${lastName}`.trim(),
    contactId: row.id,
    actorId: user.id,
  })

  revalidatePath(APP_ROUTES.contacts)
  revalidatePath(APP_ROUTES.dashboard)
  return mapContact(row)
}

export async function updateContact(id: string, input: Partial<ContactInput>): Promise<Contact> {
  const { user, workspaceId, scopeIds } = await getActingUser()

  const patch: Record<string, string | number | Date | null> = {}
  for (const [key, value] of Object.entries(input)) {
    if (value !== undefined) patch[key] = value as string | number
  }
  if (input.firstName || input.lastName) {
    const first = input.firstName ?? ""
    const last = input.lastName ?? ""
    patch.name = [first, last].filter(Boolean).join(" ")
  }
  patch.lastActivityAt = new Date()

  const [row] = await db
    .update(contacts)
    .set(patch)
    .where(and(eq(contacts.id, id), workspaceUserIdMatches(contacts.userId, scopeIds)))
    .returning()
  if (!row) throw new Error("Contact not found")

  await db.insert(activities).values({
    id: randomId("a"),
    userId: workspaceId,
    type: "edited",
    message: `updated contact ${row.firstName} ${row.lastName}`.trim(),
    contactId: id,
    actorId: user.id,
  })

  revalidatePath(APP_ROUTES.contacts)
  revalidatePath(`${APP_ROUTES.contacts}/${id}`)
  return mapContact(row)
}

export async function recordPurchase(input: {
  contactId: string
  product: string
  amountCents?: number
}): Promise<Contact> {
  const { user, workspaceId, scopeIds } = await getActingUser()
  const product = input.product?.trim()
  if (!product) throw new Error("Product is required")
  const amountCents = Math.max(0, Math.round(input.amountCents ?? 0))

  const [existing] = await db
    .select()
    .from(contacts)
    .where(and(eq(contacts.id, input.contactId), workspaceUserIdMatches(contacts.userId, scopeIds)))
    .limit(1)
  if (!existing) throw new Error("Contact not found")

  const wasCustomer =
    existing.lifecycleStage === "Customer" || existing.lifecycleStage === "Repeat Customer"
  const products = [existing.productsPurchased, product].filter(Boolean).join(", ")

  const [row] = await db
    .update(contacts)
    .set({
      lifecycleStage: wasCustomer ? "Repeat Customer" : "Customer",
      customerStatus: "Active",
      leadStatus: "Converted",
      lastPurchaseAt: new Date(),
      lastActivityAt: new Date(),
      totalRevenueCents: existing.totalRevenueCents + amountCents,
      productsPurchased: products,
      recommendedNextAction: "Send a thank-you and request a review.",
    })
    .where(and(eq(contacts.id, input.contactId), workspaceUserIdMatches(contacts.userId, scopeIds)))
    .returning()

  await db.insert(activities).values({
    id: randomId("a"),
    userId: workspaceId,
    type: "purchase_made",
    message:
      amountCents > 0
        ? `recorded purchase: ${product} (${formatRevenue(amountCents)})`
        : `recorded purchase: ${product}`,
    contactId: input.contactId,
    actorId: user.id,
  })

  // Fire purchase-triggered automations (e.g. review request).
  await processPurchaseAutomations(workspaceId, input.contactId)

  revalidatePath(APP_ROUTES.contacts)
  revalidatePath(`${APP_ROUTES.contacts}/${input.contactId}`)
  revalidatePath(APP_ROUTES.dashboard)
  return mapContact(row)
}

export async function deleteContact(id: string): Promise<void> {
  const { scopeIds } = await getActingUser()

  await db.delete(contactTags).where(eq(contactTags.contactId, id))
  await db.delete(contactGroups).where(eq(contactGroups.contactId, id))
  await db.delete(deals).where(and(eq(deals.contactId, id), workspaceUserIdMatches(deals.userId, scopeIds)))
  await db.delete(activities).where(and(eq(activities.contactId, id), workspaceUserIdMatches(activities.userId, scopeIds)))
  await db.delete(contacts).where(and(eq(contacts.id, id), workspaceUserIdMatches(contacts.userId, scopeIds)))

  revalidatePath(APP_ROUTES.contacts)
  revalidatePath(APP_ROUTES.dashboard)
  revalidatePath(APP_ROUTES.groups)
}

function parseCsvLine(line: string): string[] {
  const values: string[] = []
  let current = ""
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"') {
      inQuotes = !inQuotes
      continue
    }
    if (char === "," && !inQuotes) {
      values.push(current.trim())
      current = ""
      continue
    }
    current += char
  }
  values.push(current.trim())
  return values
}

function headerIndex(headers: string[], ...names: string[]) {
  const normalized = headers.map((h) => h.toLowerCase().replace(/[^a-z0-9]/g, ""))
  for (const name of names) {
    const key = name.toLowerCase().replace(/[^a-z0-9]/g, "")
    const idx = normalized.indexOf(key)
    if (idx >= 0) return idx
  }
  return -1
}

export type CsvImportResult = {
  created: number
  skipped: number
  errors: string[]
}

export async function importContactsFromCsv(csvText: string): Promise<CsvImportResult> {
  const { user, workspaceId } = await getActingUser()
  const lines = csvText.trim().split(/\r?\n/).filter(Boolean)
  if (lines.length < 2) throw new Error("CSV must include a header row and at least one contact")

  const headers = parseCsvLine(lines[0])
  const firstIdx = headerIndex(headers, "firstname", "first", "first name")
  const lastIdx = headerIndex(headers, "lastname", "last", "last name")
  const emailIdx = headerIndex(headers, "email", "email address")
  const phoneIdx = headerIndex(headers, "phone", "mobile", "cell")
  const sourceIdx = headerIndex(headers, "source", "lead source")
  const notesIdx = headerIndex(headers, "notes", "note")

  let created = 0
  let skipped = 0
  const errors: string[] = []

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i])
    const firstName = (firstIdx >= 0 ? cols[firstIdx] : cols[0])?.trim()
    if (!firstName) {
      skipped++
      continue
    }

    const lastName = lastIdx >= 0 ? cols[lastIdx]?.trim() ?? "" : ""
    const email = emailIdx >= 0 ? cols[emailIdx]?.trim() ?? "" : ""
    const phone = phoneIdx >= 0 ? cols[phoneIdx]?.trim() ?? "" : ""
    const source = sourceIdx >= 0 ? cols[sourceIdx]?.trim() || "csv-import" : "csv-import"
    const notes = notesIdx >= 0 ? cols[notesIdx]?.trim() ?? "" : ""

    try {
      // Route each row through the unified intake core: dedupe/merge,
      // scoring, source/interest/campaign tags, routing rules, automations.
      const result = await processLeadIntake(
        { firstName, lastName, email, phone, source, notes },
        { source: { key: "csv-import", channel: "csv" }, workspaceId },
      )

      await db.insert(activities).values({
        id: randomId("a"),
        userId: workspaceId,
        type: "created",
        message: result.isNew
          ? `imported contact ${firstName} from CSV`
          : `merged CSV row into existing contact ${firstName}`,
        contactId: result.contactId,
        actorId: user.id,
      })

      if (result.isNew) created++
      else skipped++
    } catch (err) {
      errors.push(`Row ${i + 1}: ${err instanceof Error ? err.message : "import failed"}`)
      skipped++
    }
  }

  revalidatePath(APP_ROUTES.contacts)
  revalidatePath(APP_ROUTES.dashboard)
  return { created, skipped, errors }
}
