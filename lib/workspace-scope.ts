import "server-only"

import { cache } from "react"
import { eq, inArray, or, type SQL } from "drizzle-orm"
import type { AnyColumn } from "drizzle-orm"

import { db } from "@/lib/db"
import { user as userTable } from "@/lib/db/schema"

/** When set, every signed-in user reads/writes the same shared workspace. */
export function sharedWorkspaceId(): string | null {
  const value = process.env.NULA_SHARED_WORKSPACE_ID?.trim()
  return value || null
}

export const resolveWorkspaceIdFromDb = cache(async (userId: string): Promise<string> => {
  const [row] = await db
    .select({ workspaceId: userTable.workspaceId })
    .from(userTable)
    .where(eq(userTable.id, userId))
    .limit(1)
  return row?.workspaceId ?? userId
})

/** Resolve the workspace for a signed-in user, honoring NULA_SHARED_WORKSPACE_ID. */
export const resolveActingWorkspaceId = cache(async (userId: string): Promise<string> => {
  const shared = sharedWorkspaceId()
  if (shared) return shared
  return resolveWorkspaceIdFromDb(userId)
})

/**
 * All user ids whose rows should be visible inside a workspace: the workspace id
 * itself plus every teammate's individual account id (legacy rows) and the owner id.
 */
export const getWorkspaceScopeIds = cache(async (workspaceId: string): Promise<string[]> => {
  const memberRows = await db
    .select({ id: userTable.id })
    .from(userTable)
    .where(or(eq(userTable.id, workspaceId), eq(userTable.workspaceId, workspaceId)))

  const ids = new Set<string>([workspaceId])
  for (const row of memberRows) ids.add(row.id)
  return [...ids]
})

/** Build a WHERE fragment matching any workspace-scoped owner id. */
export function workspaceUserIdMatches(column: AnyColumn, scopeIds: string[]): SQL {
  if (scopeIds.length === 1) return eq(column, scopeIds[0]!)
  return inArray(column, scopeIds)
}
