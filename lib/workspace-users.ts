import "server-only"

import { cache } from "react"
import { inArray } from "drizzle-orm"

import { db } from "@/lib/db"
import { user as userTable } from "@/lib/db/schema"
import { getWorkspaceScopeIds } from "@/lib/workspace-scope"

export type UserLabelMap = Map<string, string>

/** Prefer display name; fall back to email when name is missing or equals email. */
export function formatUserLabel(user: { name: string; email: string }): string {
  const name = user.name.trim()
  const email = user.email.trim()
  if (name && email && name.toLowerCase() !== email.toLowerCase()) return name
  return name || email || "Unknown"
}

export function labelForUserId(
  labels: UserLabelMap | undefined,
  userId: string | null | undefined,
): string {
  if (!userId?.trim()) return "—"
  return labels?.get(userId) ?? "Unknown user"
}

/** Resolve workspace member ids to human-readable labels (name or email). */
export const getWorkspaceUserLabels = cache(async (workspaceId: string): Promise<UserLabelMap> => {
  const scopeIds = await getWorkspaceScopeIds(workspaceId)
  if (scopeIds.length === 0) return new Map()

  const rows = await db
    .select({ id: userTable.id, name: userTable.name, email: userTable.email })
    .from(userTable)
    .where(inArray(userTable.id, scopeIds))

  const map: UserLabelMap = new Map()
  for (const row of rows) {
    map.set(row.id, formatUserLabel(row))
  }
  return map
})
