"use server"

import { and, eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"

import { db } from "@/lib/db"
import { activities, companies, companyTags, contactTags, contacts, tags } from "@/lib/db/schema"
import { workspaceUserIdMatches } from "@/lib/auth-helpers"
import { getActingWriter } from "@/lib/entitlements"
import { slugifyTag } from "@/lib/crm-defaults"
import { randomId } from "@/lib/library-helpers"
import { getTags } from "@/lib/queries"
import type { Tag } from "@/lib/crm-types"
import { APP_ROUTES, companyPath } from "@/lib/routes"

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

/** Ensure the contact belongs to the acting workspace before linking a tag. */
async function assertContactAccess(contactId: string, scopeIds: string[]) {
  const [row] = await db
    .select({ id: contacts.id })
    .from(contacts)
    .where(and(eq(contacts.id, contactId), workspaceUserIdMatches(contacts.userId, scopeIds)))
    .limit(1)
  if (!row) throw new Error("Contact not found")
}

/** Ensure the company belongs to the acting workspace before linking a tag. */
async function assertCompanyAccess(companyId: string, scopeIds: string[]) {
  const [row] = await db
    .select({ id: companies.id })
    .from(companies)
    .where(and(eq(companies.id, companyId), workspaceUserIdMatches(companies.userId, scopeIds)))
    .limit(1)
  if (!row) throw new Error("Company not found")
}

export async function createTag(input: TagInput) {
  const { workspaceId } = await getActingWriter()
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
  const { scopeIds } = await getActingWriter()
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
  const { scopeIds } = await getActingWriter()
  const row = await assertTagAccess(tagId, scopeIds)

  await db.delete(contactTags).where(eq(contactTags.tagId, tagId))
  await db.delete(companyTags).where(eq(companyTags.tagId, tagId))
  await db.delete(tags).where(eq(tags.id, tagId))

  revalidatePath(APP_ROUTES.tags)
  revalidatePath(APP_ROUTES.contacts)
  revalidatePath(APP_ROUTES.companies)
  return { ok: true, name: row.name }
}

export async function addTagToContact(contactId: string, tagId: string) {
  const { user, workspaceId, scopeIds } = await getActingWriter()
  await assertTagAccess(tagId, scopeIds)
  await assertContactAccess(contactId, scopeIds)

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
  const { user, workspaceId, scopeIds } = await getActingWriter()
  await assertTagAccess(tagId, scopeIds)
  await assertContactAccess(contactId, scopeIds)

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

export async function addTagToCompany(companyId: string, tagId: string) {
  const { user, scopeIds } = await getActingWriter()
  await assertTagAccess(tagId, scopeIds)
  await assertCompanyAccess(companyId, scopeIds)

  await db
    .insert(companyTags)
    .values({ companyId, tagId, addedBy: user.id })
    .onConflictDoNothing()

  revalidatePath(companyPath(companyId))
  revalidatePath(APP_ROUTES.companies)
  revalidatePath(APP_ROUTES.tags)
}

export async function removeTagFromCompany(companyId: string, tagId: string) {
  const { scopeIds } = await getActingWriter()
  await assertTagAccess(tagId, scopeIds)
  await assertCompanyAccess(companyId, scopeIds)

  await db
    .delete(companyTags)
    .where(and(eq(companyTags.companyId, companyId), eq(companyTags.tagId, tagId)))

  revalidatePath(companyPath(companyId))
  revalidatePath(APP_ROUTES.companies)
  revalidatePath(APP_ROUTES.tags)
}
