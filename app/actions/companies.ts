"use server"

import { and, eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"

import { db } from "@/lib/db"
import { companies, contacts } from "@/lib/db/schema"
import { getActingUser, workspaceUserIdMatches } from "@/lib/auth-helpers"
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
  const { workspaceId } = await getActingUser()
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
  const { scopeIds } = await getActingUser()
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

export async function deleteCompany(id: string): Promise<{ ok: true; name: string }> {
  const { scopeIds } = await getActingUser()
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
