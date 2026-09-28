"use server"

import { and, eq, inArray } from "drizzle-orm"
import { revalidatePath } from "next/cache"

import { db } from "@/lib/db"
import { contactGroups, contacts, groups } from "@/lib/db/schema"
import { workspaceUserIdMatches } from "@/lib/auth-helpers"
import { getActingWriter } from "@/lib/entitlements"
import { slugifyTag } from "@/lib/crm-defaults"
import { randomId } from "@/lib/library-helpers"
import { APP_ROUTES, targetListPath } from "@/lib/routes"
import { OUTREACH_STATUSES, TARGET_LIST_TYPE, type OutreachStatus } from "@/lib/crm-types"

async function assertListAccess(listId: string, scopeIds: string[]) {
  const [row] = await db
    .select()
    .from(groups)
    .where(and(eq(groups.id, listId), workspaceUserIdMatches(groups.userId, scopeIds)))
    .limit(1)
  if (!row || row.type !== TARGET_LIST_TYPE) throw new Error("Target list not found")
  return row
}

function revalidateList(listId: string) {
  revalidatePath(APP_ROUTES.lists)
  revalidatePath(targetListPath(listId))
}

export async function createTargetList(input: { name: string; description?: string }): Promise<{ id: string }> {
  const { workspaceId } = await getActingWriter()
  const name = input.name?.trim()
  if (!name) throw new Error("List name is required")

  const [row] = await db
    .insert(groups)
    .values({
      id: randomId("g"),
      userId: workspaceId,
      name,
      slug: slugifyTag(name),
      description: input.description?.trim() ?? "",
      type: TARGET_LIST_TYPE,
    })
    .returning()

  revalidatePath(APP_ROUTES.lists)
  return { id: row.id }
}

export async function deleteTargetList(listId: string): Promise<{ ok: true; name: string }> {
  const { scopeIds } = await getActingWriter()
  const row = await assertListAccess(listId, scopeIds)

  await db.delete(contactGroups).where(eq(contactGroups.groupId, listId))
  await db.delete(groups).where(eq(groups.id, listId))

  revalidatePath(APP_ROUTES.lists)
  return { ok: true, name: row.name }
}

export async function addContactsToTargetList(
  listId: string,
  contactIds: string[],
): Promise<{ added: number }> {
  const { user, scopeIds } = await getActingWriter()
  await assertListAccess(listId, scopeIds)
  if (contactIds.length === 0) return { added: 0 }

  // Only add contacts that belong to this workspace.
  const owned = await db
    .select({ id: contacts.id })
    .from(contacts)
    .where(and(inArray(contacts.id, contactIds), workspaceUserIdMatches(contacts.userId, scopeIds)))
  if (owned.length === 0) return { added: 0 }

  await db
    .insert(contactGroups)
    .values(owned.map((c) => ({ contactId: c.id, groupId: listId, addedBy: user.id, status: "new" })))
    .onConflictDoNothing()

  revalidateList(listId)
  return { added: owned.length }
}

export async function removeFromTargetList(listId: string, contactId: string): Promise<{ ok: true }> {
  const { scopeIds } = await getActingWriter()
  await assertListAccess(listId, scopeIds)
  await db
    .delete(contactGroups)
    .where(and(eq(contactGroups.groupId, listId), eq(contactGroups.contactId, contactId)))
  revalidateList(listId)
  return { ok: true }
}

export async function setTargetMemberStatus(
  listId: string,
  contactId: string,
  status: string,
): Promise<{ ok: true }> {
  const { scopeIds } = await getActingWriter()
  await assertListAccess(listId, scopeIds)
  if (!(OUTREACH_STATUSES as readonly string[]).includes(status)) {
    throw new Error("Invalid status")
  }
  await db
    .update(contactGroups)
    .set({ status: status as OutreachStatus, lastTouchedAt: new Date() })
    .where(and(eq(contactGroups.groupId, listId), eq(contactGroups.contactId, contactId)))
  revalidateList(listId)
  return { ok: true }
}

export async function setTargetMemberOwner(
  listId: string,
  contactId: string,
  ownerId: string,
): Promise<{ ok: true }> {
  const { scopeIds } = await getActingWriter()
  await assertListAccess(listId, scopeIds)
  await db
    .update(contactGroups)
    .set({ ownerId: ownerId.trim() })
    .where(and(eq(contactGroups.groupId, listId), eq(contactGroups.contactId, contactId)))
  revalidateList(listId)
  return { ok: true }
}

export async function setTargetMemberNote(
  listId: string,
  contactId: string,
  note: string,
): Promise<{ ok: true }> {
  const { scopeIds } = await getActingWriter()
  await assertListAccess(listId, scopeIds)
  await db
    .update(contactGroups)
    .set({ note: note.trim() })
    .where(and(eq(contactGroups.groupId, listId), eq(contactGroups.contactId, contactId)))
  revalidateList(listId)
  return { ok: true }
}
