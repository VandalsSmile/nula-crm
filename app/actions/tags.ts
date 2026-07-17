"use server"

import { and, eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"

import { db } from "@/lib/db"
import { activities, contactTags, tags } from "@/lib/db/schema"
import { getActingUser, workspaceUserIdMatches } from "@/lib/auth-helpers"
import { slugifyTag } from "@/lib/crm-defaults"
import { randomId } from "@/lib/library-helpers"
import { getTags } from "@/lib/queries"
import type { Tag } from "@/lib/crm-types"
import { APP_ROUTES } from "@/lib/routes"

export type TagInput = {
  name: string
  description?: string
  color?: string
}

/** All tags in the workspace — for client-side pickers. */
export async function listTags(): Promise<Tag[]> {
  return getTags()
}

async function assertTagAccess(tagId: string, scopeIds: string[]) {
  const [row] = await db
    .select()
    .from(tags)
    .where(and(eq(tags.id, tagId), workspaceUserIdMatches(tags.userId, scopeIds)))
    .limit(1)
  if (!row) throw new Error("Tag not found")
  return row
}

export async function createTag(input: TagInput) {
  const { workspaceId } = await getActingUser()
  const name = input.name.trim()
  if (!name) throw new Error("Tag name is required")

  const [row] = await db
    .insert(tags)
    .values({
      id: randomId("t"),
      userId: workspaceId,
      name,
      slug: slugifyTag(name),
      description: input.description?.trim() ?? "",
      color: input.color?.trim() || "#4F3DF5",
    })
    .returning()

  revalidatePath(APP_ROUTES.tags)
  revalidatePath(APP_ROUTES.contacts)
  return row
}

export async function updateTag(tagId: string, input: Partial<TagInput>) {
  const { scopeIds } = await getActingUser()
  await assertTagAccess(tagId, scopeIds)

  const patch: Record<string, string> = {}
  if (input.name !== undefined) {
    const name = input.name.trim()
    if (!name) throw new Error("Tag name is required")
    patch.name = name
    patch.slug = slugifyTag(name)
  }
  if (input.description !== undefined) patch.description = input.description.trim()
  if (input.color !== undefined) patch.color = input.color.trim() || "#4F3DF5"

  const [row] = await db.update(tags).set(patch).where(eq(tags.id, tagId)).returning()

  revalidatePath(APP_ROUTES.tags)
  revalidatePath(APP_ROUTES.contacts)
  return row
}

export async function deleteTag(tagId: string) {
  const { scopeIds } = await getActingUser()
  const row = await assertTagAccess(tagId, scopeIds)

  await db.delete(contactTags).where(eq(contactTags.tagId, tagId))
  await db.delete(tags).where(eq(tags.id, tagId))

  revalidatePath(APP_ROUTES.tags)
  revalidatePath(APP_ROUTES.contacts)
  return { ok: true, name: row.name }
}

export async function addTagToContact(contactId: string, tagId: string) {
  const { user, workspaceId, scopeIds } = await getActingUser()
  await assertTagAccess(tagId, scopeIds)

  await db
    .insert(contactTags)
    .values({ contactId, tagId, addedBy: user.id })
    .onConflictDoNothing()

  await db.insert(activities).values({
    id: randomId("a"),
    userId: workspaceId,
    type: "tag_added",
    message: "tag added to contact",
    contactId,
    actorId: user.id,
  })

  revalidatePath(`${APP_ROUTES.contacts}/${contactId}`)
  revalidatePath(APP_ROUTES.tags)
}

export async function removeTagFromContact(contactId: string, tagId: string) {
  const { user, workspaceId, scopeIds } = await getActingUser()
  await assertTagAccess(tagId, scopeIds)

  await db
    .delete(contactTags)
    .where(and(eq(contactTags.contactId, contactId), eq(contactTags.tagId, tagId)))

  await db.insert(activities).values({
    id: randomId("a"),
    userId: workspaceId,
    type: "tag_added",
    message: "tag removed from contact",
    contactId,
    actorId: user.id,
  })

  revalidatePath(`${APP_ROUTES.contacts}/${contactId}`)
  revalidatePath(APP_ROUTES.tags)
}
