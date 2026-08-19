import "server-only"

import { and, eq, ilike } from "drizzle-orm"
import { revalidatePath } from "next/cache"

import { getWorkspaceScopeIds, workspaceUserIdMatches } from "@/lib/auth-helpers"
import { db } from "@/lib/db"
import { activities, bookings, contacts } from "@/lib/db/schema"
import { randomId } from "@/lib/library-helpers"
import { APP_ROUTES } from "@/lib/routes"

/** Read a dotted path (supports numeric array indexes) from a nested object. */
function getPath(obj: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc == null) return undefined
    if (Array.isArray(acc)) return acc[Number(key)]
    if (typeof acc === "object") return (acc as Record<string, unknown>)[key]
    return undefined
  }, obj)
}

function firstString(raw: unknown, paths: string[]): string {
  for (const p of paths) {
    const v = getPath(raw, p)
    if (typeof v === "string" && v.trim()) return v.trim()
    if (typeof v === "number") return String(v)
  }
  return ""
}

const FIELD_PATHS: Record<string, string[]> = {
  name: ["payload.name", "payload.invitee.name", "payload.attendees.0.name", "name", "invitee.name", "attendee.name"],
  email: ["payload.email", "payload.invitee.email", "payload.attendees.0.email", "email", "invitee.email", "attendee.email"],
  phone: ["payload.phone", "payload.attendees.0.phone", "payload.text_reminder_number", "phone"],
  title: ["payload.scheduled_event.name", "payload.event_type.name", "payload.eventType.title", "payload.title", "title", "event_type_name"],
  start: ["payload.scheduled_event.start_time", "payload.startTime", "payload.start_time", "start_time", "startTime", "start"],
  end: ["payload.scheduled_event.end_time", "payload.endTime", "payload.end_time", "end_time", "endTime", "end"],
  location: ["payload.scheduled_event.location.location", "payload.location.join_url", "payload.location", "location"],
  externalId: ["payload.uri", "payload.scheduled_event.uri", "payload.uid", "payload.id", "payload.uuid", "uid", "id", "uuid"],
}

export type BookingIntakeResult = {
  bookingId: string
  contactId: string
  isNewContact: boolean
  status: string
}

function parseDate(value: string): Date | null {
  if (!value) return null
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

function splitName(full: string): { first: string; last: string } {
  const parts = full.trim().split(/\s+/)
  if (parts.length === 0 || !parts[0]) return { first: "", last: "" }
  return { first: parts[0], last: parts.slice(1).join(" ") }
}

async function matchOrCreateContact(
  workspaceId: string,
  scopeIds: string[],
  info: { name: string; email: string; phone: string; source: string },
): Promise<{ contactId: string; isNew: boolean }> {
  const email = info.email.trim().toLowerCase()
  const phone = info.phone.trim()

  if (email) {
    const [row] = await db
      .select({ id: contacts.id })
      .from(contacts)
      .where(and(workspaceUserIdMatches(contacts.userId, scopeIds), ilike(contacts.email, email)))
      .limit(1)
    if (row) return { contactId: row.id, isNew: false }
  } else if (phone) {
    const [row] = await db
      .select({ id: contacts.id })
      .from(contacts)
      .where(and(workspaceUserIdMatches(contacts.userId, scopeIds), eq(contacts.phone, phone)))
      .limit(1)
    if (row) return { contactId: row.id, isNew: false }
  }

  if (!email && !phone && !info.name.trim()) {
    return { contactId: "", isNew: false }
  }

  const { first, last } = splitName(info.name)
  const [created] = await db
    .insert(contacts)
    .values({
      id: randomId("ct"),
      userId: workspaceId,
      firstName: first,
      lastName: last,
      name: [first, last].filter(Boolean).join(" ") || info.name.trim(),
      email,
      phone,
      source: info.source || "booking",
      lifecycleStage: "New Lead",
      lastActivityAt: new Date(),
    })
    .returning({ id: contacts.id })
  return { contactId: created.id, isNew: true }
}

/**
 * Ingest a booking/appointment from a scheduling integration webhook. Normalizes
 * common provider shapes (Calendly, Cal.com, generic), links or creates the CRM
 * contact for the attendee, upserts the booking (idempotent on externalId), and
 * logs an appointment_booked activity.
 */
export async function processBookingIntake(
  raw: Record<string, unknown>,
  opts: { workspaceId: string; source?: string; fieldMapping?: Record<string, string> },
): Promise<BookingIntakeResult> {
  const scopeIds = await getWorkspaceScopeIds(opts.workspaceId)
  const map = opts.fieldMapping ?? {}
  const field = (key: string) =>
    firstString(raw, [...(map[key] ? [map[key]] : []), ...(FIELD_PATHS[key] ?? [])])

  const name = field("name")
  const email = field("email")
  const phone = field("phone")
  const title = field("title") || "Appointment"
  const startAt = parseDate(field("start"))
  const endAt = parseDate(field("end"))
  const location = field("location")
  const externalId = field("externalId")

  const eventKind = firstString(raw, ["event", "triggerEvent", "type"]).toLowerCase()
  const status = /cancel/.test(eventKind) ? "canceled" : "scheduled"

  const { contactId, isNew } = await matchOrCreateContact(opts.workspaceId, scopeIds, {
    name,
    email,
    phone,
    source: opts.source || "booking",
  })

  // Upsert by (workspace, externalId) so repeated webhook deliveries or
  // reschedules update the same booking rather than duplicating it.
  const existing = externalId
    ? (
        await db
          .select({ id: bookings.id })
          .from(bookings)
          .where(and(eq(bookings.userId, opts.workspaceId), eq(bookings.externalId, externalId)))
          .limit(1)
      )[0]
    : undefined

  let bookingId: string
  if (existing) {
    await db
      .update(bookings)
      .set({
        contactId,
        title,
        status,
        startAt,
        endAt,
        location,
        attendeeName: name,
        attendeeEmail: email,
        attendeePhone: phone,
        source: opts.source || "booking",
        updatedAt: new Date(),
      })
      .where(eq(bookings.id, existing.id))
    bookingId = existing.id
  } else {
    const [row] = await db
      .insert(bookings)
      .values({
        id: randomId("bk"),
        userId: opts.workspaceId,
        contactId,
        title,
        status,
        startAt,
        endAt,
        location,
        attendeeName: name,
        attendeeEmail: email,
        attendeePhone: phone,
        source: opts.source || "booking",
        externalId,
      })
      .returning({ id: bookings.id })
    bookingId = row.id
  }

  if (contactId) {
    const when = startAt ? ` on ${startAt.toISOString().slice(0, 16).replace("T", " ")}` : ""
    await db.insert(activities).values({
      id: randomId("a"),
      userId: opts.workspaceId,
      type: status === "canceled" ? "appointment_canceled" : "appointment_booked",
      message: status === "canceled" ? `Appointment canceled: ${title}` : `Booked: ${title}${when}`,
      contactId,
      actorId: "",
    })
    await db
      .update(contacts)
      .set({ lastActivityAt: new Date() })
      .where(and(eq(contacts.id, contactId), workspaceUserIdMatches(contacts.userId, scopeIds)))
  }

  revalidatePath(APP_ROUTES.calendar)
  revalidatePath(APP_ROUTES.dashboard)
  if (contactId) revalidatePath(`${APP_ROUTES.contacts}/${contactId}`)

  return { bookingId, contactId, isNewContact: isNew, status }
}
