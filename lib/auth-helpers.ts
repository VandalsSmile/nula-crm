import { cache } from "react"
import { eq } from "drizzle-orm"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { user as userTable } from "@/lib/db/schema"
import { headers } from "next/headers"
import {
  getWorkspaceScopeIds,
  resolveActingWorkspaceId,
} from "@/lib/workspace-scope"

export {
  getWorkspaceScopeIds,
  resolveActingWorkspaceId,
  sharedWorkspaceId,
  workspaceUserIdMatches,
} from "@/lib/workspace-scope"

/** Returns the signed-in user, or null when there is no session. */
export async function getSessionUser() {
  const session = await auth.api.getSession({ headers: await headers() })
  return session?.user ?? null
}

/**
 * Resolve a user's shared workspace id. The account owner's workspaceId equals
 * their own id; invited teammates inherit the owner's id. Honors
 * SPACKLE_SHARED_WORKSPACE_ID when set. Memoized per request.
 */
export const resolveWorkspaceId = resolveActingWorkspaceId

/**
 * The scoping id for all app data (clients, posts, media, activities). This is
 * the WORKSPACE id, not the individual user id, so teammates sharing a
 * workspace see and edit the same data. Throws when unauthenticated.
 */
export async function getWorkspaceId() {
  const user = await getSessionUser()
  if (!user) throw new Error("Unauthorized")
  return resolveActingWorkspaceId(user.id)
}

/**
 * Alias of {@link getWorkspaceId}. Named `getUserId` for the many existing
 * query call-sites whose `eq(table.userId, …)` filters now scope by workspace.
 */
export const getUserId = getWorkspaceId

export async function getWorkspaceScope() {
  const workspaceId = await getWorkspaceId()
  const scopeIds = await getWorkspaceScopeIds(workspaceId)
  return { workspaceId, scopeIds }
}

/**
 * The signed-in user plus their workspace id. Use `user.id`/`user.name` for
 * attribution (who did something) and `workspaceId` for data scoping.
 */
export async function getActingUser() {
  const user = await getSessionUser()
  if (!user) throw new Error("Unauthorized")
  const workspaceId = await resolveActingWorkspaceId(user.id)
  const scopeIds = await getWorkspaceScopeIds(workspaceId)
  return { user, workspaceId, scopeIds }
}
