"use server"

import { and, eq, inArray } from "drizzle-orm"
import { revalidatePath } from "next/cache"

import { db } from "@/lib/db"
import { contactGroups, contacts, groups } from "@/lib/db/schema"
import { workspaceUserIdMatches } from "@/lib/auth-helpers"
import { getActingWriter } from "@/lib/entitlements"
import { canManageTeam, type WorkspaceRole } from "@/lib/roles"
import { slugifyTag } from "@/lib/crm-defaults"
import { randomId } from "@/lib/library-helpers"
import { APP_ROUTES, targetListPath } from "@/lib/routes"
import { OUTREACH_STATUSES, TARGET_LIST_TYPE, type OutreachStatus } from "@/lib/crm-types"

type Acting = { scopeIds: string[]; userId: string; role: WorkspaceRole }

async function assertListAccess(listId: string, acting: Acting) {
  const [row] = await db
    .select()
    .from(groups)
    .where(and(eq(groups.id, listId), workspaceUserIdMatches(groups.userId, acting.scopeIds)))
    .limit(1)
  if (!row || row.type !== TARGET_LIST_TYPE) throw new Error("Target list not found")
  // A private list is only reachable by its owner or a workspace Owner/Admin.
  if (row.visibility === "private" && !canManageTeam(acting.role) && row.ownerId !== acting.userId) {
    throw new Error("Target list not found")
  }
  return row
}

function actingOf(a: { user: { id: string }; scopeIds: string[]; role: WorkspaceRole }): Acting {
  return { scopeIds: a.scopeIds, userId: a.user.id, role: a.role }
}

function revalidateList(listId: string) {
  revalidatePath(APP_ROUTES.lists)
  revalidatePath(targetListPath(listId))
}

export async function createTargetList(input: {
  name: string
  description?: string
  visibility?: string
}): Promise<{ id: string }> {
  const { user, workspaceId } = await getActingWriter()
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
      // Shared by default; the owner can make it private. Owners/Admins always see it.
      ownerId: user.id,
      visibility: input.visibility === "private" ? "private" : "shared",
    })
    .returning()

  revalidatePath(APP_ROUTES.lists)
  return { id: row.id }
}

/** Change a list's visibility. Owner or workspace Owner/Admin only. */
export async function setTargetListVisibility(
  listId: string,
  visibility: string,
): Promise<{ ok: true; visibility: "shared" | "private" }> {
  const acting = await getActingWriter()
  const row = await assertListAccess(listId, actingOf(acting))
  if (!canManageTeam(acting.role) && row.ownerId !== acting.user.id) {
    throw new Error("Only the list owner or an admin can change who can see it")
  }
  const v = visibility === "private" ? "private" : "shared"
  await db.update(groups).set({ visibility: v }).where(eq(groups.id, listId))
  revalidateList(listId)
  return { ok: true, visibility: v }
}

export async function deleteTargetList(listId: string): Promise<{ ok: true; name: string }> {
  const acting = await getActingWriter()
  const row = await assertListAccess(listId, actingOf(acting))

  await db.delete(contactGroups).where(eq(contactGroups.groupId, listId))
  await db.delete(groups).where(eq(groups.id, listId))

  revalidatePath(APP_ROUTES.lists)
  return { ok: true, name: row.name }
}

export async function addContactsToTargetList(
  listId: string,
  contactIds: string[],
): Promise<{ added: number }> {
  const acting = await getActingWriter()
  const { user, scopeIds } = acting
  await assertListAccess(listId, actingOf(acting))
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
  const acting = await getActingWriter()
  await assertListAccess(listId, actingOf(acting))
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
  const acting = await getActingWriter()
  await assertListAccess(listId, actingOf(acting))
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
  const acting = await getActingWriter()
  await assertListAccess(listId, actingOf(acting))
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
  const acting = await getActingWriter()
  await assertListAccess(listId, actingOf(acting))
  await db
    .update(contactGroups)
    .set({ note: note.trim() })
    .where(and(eq(contactGroups.groupId, listId), eq(contactGroups.contactId, contactId)))
  revalidateList(listId)
  return { ok: true }
}
