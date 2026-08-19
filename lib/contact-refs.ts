import "server-only"

import { and, eq, inArray } from "drizzle-orm"

import { workspaceUserIdMatches } from "@/lib/auth-helpers"
import { db } from "@/lib/db"
import { companies, locations, tags } from "@/lib/db/schema"

/**
 * Validate optional foreign keys on a contact so we never persist a reference
 * to another workspace's row (IDOR / cross-tenant leakage). Each returns "" (or
 * a fallback) when the id doesn't belong to the acting workspace.
 */

export async function sanitizeCompanyId(
  companyId: string | undefined,
  scopeIds: string[],
): Promise<string> {
  const id = companyId?.trim() ?? ""
  if (!id) return ""
  const [row] = await db
    .select({ id: companies.id })
    .from(companies)
    .where(and(eq(companies.id, id), workspaceUserIdMatches(companies.userId, scopeIds)))
    .limit(1)
  return row ? id : ""
}

export async function sanitizeLocationId(
  locationId: string | undefined,
  scopeIds: string[],
): Promise<string> {
  const id = locationId?.trim() ?? ""
  if (!id) return ""
  const [row] = await db
    .select({ id: locations.id })
    .from(locations)
    .where(and(eq(locations.id, id), workspaceUserIdMatches(locations.userId, scopeIds)))
    .limit(1)
  return row ? id : ""
}

/**
 * A contact owner must be a member of the workspace. `scopeIds` already
 * enumerates every workspace member's user id, so membership is a simple
 * lookup. Returns `fallback` (e.g. the acting user) when the id isn't a member.
 */
export function sanitizeOwnerId(
  ownerId: string | undefined,
  scopeIds: string[],
  fallback = "",
): string {
  const id = ownerId?.trim() ?? ""
  return id && scopeIds.includes(id) ? id : fallback
}

/** Keep only tag ids that belong to the acting workspace. De-dupes and trims. */
export async function sanitizeTagIds(
  tagIds: string[] | undefined,
  scopeIds: string[],
): Promise<string[]> {
  const ids = [...new Set((tagIds ?? []).map((t) => t?.trim()).filter(Boolean))] as string[]
  if (!ids.length) return []
  const rows = await db
    .select({ id: tags.id })
    .from(tags)
    .where(and(inArray(tags.id, ids), workspaceUserIdMatches(tags.userId, scopeIds)))
  return rows.map((r) => r.id)
}
