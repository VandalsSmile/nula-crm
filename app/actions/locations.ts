"use server"

import { and, eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"

import { db } from "@/lib/db"
import { companies, contacts, locations } from "@/lib/db/schema"
import { getActingUser, workspaceUserIdMatches } from "@/lib/auth-helpers"
import { randomId } from "@/lib/library-helpers"
import { mapLocation } from "@/lib/mappers"
import type { Location } from "@/lib/crm-types"
import { getLocationsForCompany } from "@/lib/queries"
import { APP_ROUTES, companyPath } from "@/lib/routes"

export type LocationInput = {
  name: string
  address?: string
  city?: string
  state?: string
  zip?: string
  phone?: string
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

async function assertLocationAccess(locationId: string, scopeIds: string[]) {
  const [row] = await db
    .select()
    .from(locations)
    .where(and(eq(locations.id, locationId), workspaceUserIdMatches(locations.userId, scopeIds)))
    .limit(1)
  if (!row) throw new Error("Location not found")
  return row
}

/** Locations for a company (with contact counts) — used by pickers and the company page. */
export async function listLocations(companyId: string): Promise<Location[]> {
  if (!companyId) return []
  return getLocationsForCompany(companyId)
}

export async function createLocation(companyId: string, input: LocationInput): Promise<Location> {
  const { workspaceId, scopeIds } = await getActingUser()
  await assertCompanyAccess(companyId, scopeIds)
  const name = input.name?.trim()
  if (!name) throw new Error("Location name is required")

  const [row] = await db
    .insert(locations)
    .values({
      id: randomId("loc"),
      userId: workspaceId,
      companyId,
      name,
      address: input.address?.trim() ?? "",
      city: input.city?.trim() ?? "",
      state: input.state?.trim() ?? "",
      zip: input.zip?.trim() ?? "",
      phone: input.phone?.trim() ?? "",
    })
    .returning()

  revalidatePath(companyPath(companyId))
  return mapLocation(row, 0)
}

export async function updateLocation(id: string, input: Partial<LocationInput>): Promise<Location> {
  const { scopeIds } = await getActingUser()
  const existing = await assertLocationAccess(id, scopeIds)

  const patch: Record<string, string> = {}
  for (const [key, value] of Object.entries(input)) {
    if (value !== undefined) patch[key] = String(value).trim()
  }

  const [row] = await db
    .update(locations)
    .set(patch)
    .where(and(eq(locations.id, id), workspaceUserIdMatches(locations.userId, scopeIds)))
    .returning()

  revalidatePath(companyPath(existing.companyId))
  revalidatePath(APP_ROUTES.contacts)
  return mapLocation(row, 0)
}

export async function deleteLocation(id: string): Promise<{ ok: true }> {
  const { scopeIds } = await getActingUser()
  const existing = await assertLocationAccess(id, scopeIds)

  // Unlink contacts from this location (they stay on the company).
  await db
    .update(contacts)
    .set({ locationId: "" })
    .where(and(eq(contacts.locationId, id), workspaceUserIdMatches(contacts.userId, scopeIds)))

  await db
    .delete(locations)
    .where(and(eq(locations.id, id), workspaceUserIdMatches(locations.userId, scopeIds)))

  revalidatePath(companyPath(existing.companyId))
  revalidatePath(APP_ROUTES.contacts)
  return { ok: true }
}
