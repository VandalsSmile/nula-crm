"use server"

import { and, eq, inArray, ne } from "drizzle-orm"
import { revalidatePath } from "next/cache"

import { db } from "@/lib/db"
import { companies, contacts, locations } from "@/lib/db/schema"
import { workspaceUserIdMatches } from "@/lib/auth-helpers"
import { getActingWriter } from "@/lib/entitlements"
import { randomId } from "@/lib/library-helpers"
import { mapCompany } from "@/lib/mappers"
import type { Company } from "@/lib/crm-types"
import { getCompanies } from "@/lib/queries"
import { APP_ROUTES, companyPath } from "@/lib/routes"

export type CompanyInput = {
  name: string
  website?: string
  phone?: string
  address?: string
  city?: string
  state?: string
  zip?: string
  notes?: string
}

async function assertCompanyAccess(companyId: string, scopeIds: string[]) {
  const [row] = await db
    .select()
    .from(companies)
    .where(and(eq(companies.id, companyId), workspaceUserIdMatches(companies.userId, scopeIds)))
    .limit(1)
  if (!row) throw new Error("Company not found")
  return row
}

/** List all companies in the workspace (with contact counts) — used by pickers. */
export async function listCompanies(): Promise<Company[]> {
  return getCompanies()
}

export async function createCompany(input: CompanyInput): Promise<Company> {
  const { workspaceId } = await getActingWriter()
  const name = input.name?.trim()
  if (!name) throw new Error("Company name is required")

  const [row] = await db
    .insert(companies)
    .values({
      id: randomId("co"),
      userId: workspaceId,
      name,
      website: input.website?.trim() ?? "",
      phone: input.phone?.trim() ?? "",
      address: input.address?.trim() ?? "",
      city: input.city?.trim() ?? "",
      state: input.state?.trim() ?? "",
      zip: input.zip?.trim() ?? "",
      notes: input.notes?.trim() ?? "",
    })
    .returning()

  revalidatePath(APP_ROUTES.companies)
  return mapCompany(row, 0)
}

export async function updateCompany(id: string, input: Partial<CompanyInput>): Promise<Company> {
  const { scopeIds } = await getActingWriter()
  await assertCompanyAccess(id, scopeIds)

  const patch: Record<string, string> = {}
  for (const [key, value] of Object.entries(input)) {
    if (value !== undefined) patch[key] = String(value).trim()
  }

  const [row] = await db
    .update(companies)
    .set(patch)
    .where(and(eq(companies.id, id), workspaceUserIdMatches(companies.userId, scopeIds)))
    .returning()

  // Keep the denormalized contacts.companyName in sync when the name changes.
  if (typeof patch.name === "string" && patch.name) {
    await db
      .update(contacts)
      .set({ companyName: patch.name })
      .where(and(eq(contacts.companyId, id), workspaceUserIdMatches(contacts.userId, scopeIds)))
  }

  revalidatePath(APP_ROUTES.companies)
  revalidatePath(companyPath(id))
  revalidatePath(APP_ROUTES.contacts)
  return mapCompany(row, 0)
}

/**
 * Create company records from contacts that have a free-text company name but no
 * linked company, and link those contacts. Existing companies are matched by
 * name (case-insensitive) so we don't create duplicates.
 */
export async function backfillCompaniesFromContacts(): Promise<{ created: number; linked: number }> {
  const { workspaceId, scopeIds } = await getActingWriter()

  const rows = await db
    .select({ id: contacts.id, companyName: contacts.companyName })
    .from(contacts)
    .where(
      and(
        workspaceUserIdMatches(contacts.userId, scopeIds),
        eq(contacts.companyId, ""),
        ne(contacts.companyName, ""),
      ),
    )
  if (rows.length === 0) return { created: 0, linked: 0 }

  const existing = await db
    .select({ id: companies.id, name: companies.name })
    .from(companies)
    .where(workspaceUserIdMatches(companies.userId, scopeIds))
  const byName = new Map(existing.map((c) => [c.name.trim().toLowerCase(), c.id]))

  const groups = new Map<string, { name: string; ids: string[] }>()
  for (const r of rows) {
    const key = r.companyName.trim().toLowerCase()
    if (!key) continue
    const g = groups.get(key) ?? { name: r.companyName.trim(), ids: [] }
    g.ids.push(r.id)
    groups.set(key, g)
  }

  let created = 0
  let linked = 0
  for (const [key, group] of groups) {
    let companyId = byName.get(key)
    if (!companyId) {
      const [row] = await db
        .insert(companies)
        .values({ id: randomId("co"), userId: workspaceId, name: group.name })
        .returning()
      companyId = row.id
      byName.set(key, companyId)
      created++
    }
    await db
      .update(contacts)
      .set({ companyId })
      .where(and(inArray(contacts.id, group.ids), workspaceUserIdMatches(contacts.userId, scopeIds)))
    linked += group.ids.length
  }

  revalidatePath(APP_ROUTES.companies)
  revalidatePath(APP_ROUTES.contacts)
  return { created, linked }
}

/** Merge one company into another: move its contacts + locations, then delete it. */
export async function mergeCompany(sourceId: string, targetId: string): Promise<{ ok: true }> {
  const { scopeIds } = await getActingWriter()
  if (!sourceId || !targetId || sourceId === targetId) {
    throw new Error("Pick a different company to merge into.")
  }
  await assertCompanyAccess(sourceId, scopeIds)
  const target = await assertCompanyAccess(targetId, scopeIds)

  await db
    .update(contacts)
    .set({ companyId: targetId, companyName: target.name })
    .where(and(eq(contacts.companyId, sourceId), workspaceUserIdMatches(contacts.userId, scopeIds)))
  await db
    .update(locations)
    .set({ companyId: targetId })
    .where(and(eq(locations.companyId, sourceId), workspaceUserIdMatches(locations.userId, scopeIds)))
  await db
    .delete(companies)
    .where(and(eq(companies.id, sourceId), workspaceUserIdMatches(companies.userId, scopeIds)))

  revalidatePath(APP_ROUTES.companies)
  revalidatePath(companyPath(targetId))
  revalidatePath(APP_ROUTES.contacts)
  return { ok: true }
}

export async function deleteCompany(id: string): Promise<{ ok: true; name: string }> {
  const { scopeIds } = await getActingWriter()
  const row = await assertCompanyAccess(id, scopeIds)

  // Unlink contacts (keep their free-text companyName as a historical label).
  await db
    .update(contacts)
    .set({ companyId: "" })
    .where(and(eq(contacts.companyId, id), workspaceUserIdMatches(contacts.userId, scopeIds)))

  await db
    .delete(companies)
    .where(and(eq(companies.id, id), workspaceUserIdMatches(companies.userId, scopeIds)))

  revalidatePath(APP_ROUTES.companies)
  revalidatePath(APP_ROUTES.contacts)
  return { ok: true, name: row.name }
}
