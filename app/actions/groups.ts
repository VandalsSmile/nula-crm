"use server"

import { and, eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"

import { db } from "@/lib/db"
import { activities, campaigns, contactGroups, contacts, groups } from "@/lib/db/schema"
import { getActingUser, workspaceUserIdMatches } from "@/lib/auth-helpers"
import { slugifyTag } from "@/lib/crm-defaults"
import { randomId } from "@/lib/library-helpers"
import { APP_ROUTES, groupPath } from "@/lib/routes"

export type GroupInput = {
  name: string
  description?: string
  type?: string
}

async function assertGroupAccess(groupId: string, scopeIds: string[]) {
  const [row] = await db
    .select()
    .from(groups)
    .where(and(eq(groups.id, groupId), workspaceUserIdMatches(groups.userId, scopeIds)))
    .limit(1)
  if (!row) throw new Error("Group not found")
  return row
}

export async function createGroup(input: GroupInput) {
  const { workspaceId } = await getActingUser()
  const name = input.name.trim()
  if (!name) throw new Error("Group name is required")

  const [row] = await db
    .insert(groups)
    .values({
      id: randomId("g"),
      userId: workspaceId,
      name,
      slug: slugifyTag(name),
      description: input.description?.trim() ?? "",
      type: input.type?.trim() || "audience",
    })
    .returning()

  revalidatePath(APP_ROUTES.groups)
  return row
}

export async function updateGroup(groupId: string, input: Partial<GroupInput>) {
  const { scopeIds } = await getActingUser()
  await assertGroupAccess(groupId, scopeIds)

  const patch: Record<string, string> = {}
  if (input.name !== undefined) {
    const name = input.name.trim()
    if (!name) throw new Error("Group name is required")
    patch.name = name
    patch.slug = slugifyTag(name)
  }
  if (input.description !== undefined) patch.description = input.description.trim()
  if (input.type !== undefined) patch.type = input.type.trim() || "audience"

  const [row] = await db.update(groups).set(patch).where(eq(groups.id, groupId)).returning()

  revalidatePath(APP_ROUTES.groups)
  revalidatePath(groupPath(groupId))
  return row
}

export async function deleteGroup(groupId: string) {
  const { scopeIds } = await getActingUser()
  const row = await assertGroupAccess(groupId, scopeIds)

  await db.delete(contactGroups).where(eq(contactGroups.groupId, groupId))
  await db
    .update(campaigns)
    .set({ groupId: null, updatedAt: new Date() })
    .where(eq(campaigns.groupId, groupId))
  await db.delete(groups).where(eq(groups.id, groupId))

  revalidatePath(APP_ROUTES.groups)
  revalidatePath(APP_ROUTES.campaigns)
  return { ok: true, name: row.name }
}

export async function addContactToGroup(contactId: string, groupId: string) {
  const { user, workspaceId, scopeIds } = await getActingUser()
  await assertGroupAccess(groupId, scopeIds)

  const [contact] = await db
    .select({ id: contacts.id })
    .from(contacts)
    .where(and(eq(contacts.id, contactId), workspaceUserIdMatches(contacts.userId, scopeIds)))
    .limit(1)
  if (!contact) throw new Error("Contact not found")

  await db
    .insert(contactGroups)
    .values({ contactId, groupId, addedBy: user.id })
    .onConflictDoNothing()

  await db.insert(activities).values({
    id: randomId("a"),
    userId: workspaceId,
    type: "group_changed",
    message: "contact added to group",
    contactId,
    actorId: user.id,
  })

  revalidatePath(`${APP_ROUTES.contacts}/${contactId}`)
  revalidatePath(APP_ROUTES.groups)
  revalidatePath(groupPath(groupId))
}

export async function removeContactFromGroup(contactId: string, groupId: string) {
  const { user, workspaceId, scopeIds } = await getActingUser()
  await assertGroupAccess(groupId, scopeIds)

  await db
    .delete(contactGroups)
    .where(and(eq(contactGroups.contactId, contactId), eq(contactGroups.groupId, groupId)))

  await db.insert(activities).values({
    id: randomId("a"),
    userId: workspaceId,
    type: "group_changed",
    message: "contact removed from group",
    contactId,
    actorId: user.id,
  })

  revalidatePath(`${APP_ROUTES.contacts}/${contactId}`)
  revalidatePath(APP_ROUTES.groups)
  revalidatePath(groupPath(groupId))
}
