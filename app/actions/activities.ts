"use server"

import { and, eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"

import { db } from "@/lib/db"
import { activities, contacts } from "@/lib/db/schema"
import { getActingUser, workspaceUserIdMatches } from "@/lib/auth-helpers"
import { randomId } from "@/lib/library-helpers"
import { APP_ROUTES } from "@/lib/routes"

export async function addContactNote(contactId: string, message: string) {
  const { user, workspaceId, scopeIds } = await getActingUser()
  const text = message.trim()
  if (!text) throw new Error("Note cannot be empty")

  const [contact] = await db
    .select({ id: contacts.id })
    .from(contacts)
    .where(and(eq(contacts.id, contactId), workspaceUserIdMatches(contacts.userId, scopeIds)))
    .limit(1)
  if (!contact) throw new Error("Contact not found")

  await db.insert(activities).values({
    id: randomId("a"),
    userId: workspaceId,
    type: "note_added",
    message: text,
    contactId,
    actorId: user.id,
  })

  await db
    .update(contacts)
    .set({ lastActivityAt: new Date() })
    .where(eq(contacts.id, contactId))

  revalidatePath(`${APP_ROUTES.contacts}/${contactId}`)
  revalidatePath(APP_ROUTES.dashboard)
}

export async function deleteActivity(activityId: string) {
  const { scopeIds } = await getActingUser()

  const [row] = await db
    .select()
    .from(activities)
    .where(and(eq(activities.id, activityId), workspaceUserIdMatches(activities.userId, scopeIds)))
    .limit(1)
  if (!row) throw new Error("Activity not found")

  await db.delete(activities).where(eq(activities.id, activityId))

  if (row.contactId) {
    revalidatePath(`${APP_ROUTES.contacts}/${row.contactId}`)
  }
  revalidatePath(APP_ROUTES.dashboard)
  return { ok: true }
}
