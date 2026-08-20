"use server"

import { and, eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"

import { db } from "@/lib/db"
import { bookings } from "@/lib/db/schema"
import { workspaceUserIdMatches } from "@/lib/auth-helpers"
import { getActingWriter } from "@/lib/entitlements"
import { randomId } from "@/lib/library-helpers"
import { APP_ROUTES } from "@/lib/routes"

export type BookingInput = {
  title: string
  startAt?: string | null
  endAt?: string | null
  location?: string
  notes?: string
  contactId?: string
  status?: string
}

function parseDate(value?: string | null): Date | null {
  if (!value) return null
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

function revalidateBooking(contactId?: string) {
  revalidatePath(APP_ROUTES.calendar)
  revalidatePath(APP_ROUTES.dashboard)
  if (contactId) revalidatePath(`${APP_ROUTES.contacts}/${contactId}`)
}

export async function createBooking(input: BookingInput) {
  const { workspaceId } = await getActingWriter()
  const [row] = await db
    .insert(bookings)
    .values({
      id: randomId("bk"),
      userId: workspaceId,
      contactId: input.contactId?.trim() ?? "",
      title: input.title?.trim() || "Appointment",
      status: input.status || "scheduled",
      startAt: parseDate(input.startAt),
      endAt: parseDate(input.endAt),
      location: input.location?.trim() ?? "",
      notes: input.notes?.trim() ?? "",
      source: "manual",
    })
    .returning()
  revalidateBooking(row.contactId)
  return row
}

export async function updateBooking(id: string, input: Partial<BookingInput>) {
  const { scopeIds } = await getActingWriter()
  const patch: Record<string, string | Date | null> = { updatedAt: new Date() }
  if (input.title !== undefined) patch.title = input.title.trim() || "Appointment"
  if (input.startAt !== undefined) patch.startAt = parseDate(input.startAt)
  if (input.endAt !== undefined) patch.endAt = parseDate(input.endAt)
  if (input.location !== undefined) patch.location = input.location.trim()
  if (input.notes !== undefined) patch.notes = input.notes.trim()
  if (input.contactId !== undefined) patch.contactId = input.contactId.trim()
  if (input.status !== undefined) patch.status = input.status

  const [row] = await db
    .update(bookings)
    .set(patch)
    .where(and(eq(bookings.id, id), workspaceUserIdMatches(bookings.userId, scopeIds)))
    .returning()
  if (!row) throw new Error("Appointment not found")
  revalidateBooking(row.contactId)
  return row
}

export async function deleteBooking(id: string) {
  const { scopeIds } = await getActingWriter()
  const [row] = await db
    .select({ contactId: bookings.contactId })
    .from(bookings)
    .where(and(eq(bookings.id, id), workspaceUserIdMatches(bookings.userId, scopeIds)))
    .limit(1)
  if (!row) throw new Error("Appointment not found")
  await db.delete(bookings).where(eq(bookings.id, id))
  revalidateBooking(row.contactId)
  return { ok: true }
}
