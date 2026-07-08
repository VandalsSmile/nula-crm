import { eq } from "drizzle-orm"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { user as userTable } from "@/lib/db/schema"
import { headers } from "next/headers"
import {
  getWorkspaceScopeIds,
  resolveActingWorkspaceId,
} from "@/lib/workspace-scope"
import { normalizeRole, type WorkspaceRole } from "@/lib/roles"

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

export { normalizeRole } from "@/lib/roles"
export type { WorkspaceRole } from "@/lib/roles"

/**
 * Resolve a user's role. The workspace owner (whose id equals the workspace id)
 * is always Owner; everyone else uses their stored role.
 */
export async function getUserRole(userId: string, workspaceId?: string): Promise<WorkspaceRole> {
  const ws = workspaceId ?? (await resolveActingWorkspaceId(userId))
  if (userId === ws) return "Owner"
  const [row] = await db.select({ role: userTable.role }).from(userTable).where(eq(userTable.id, userId)).limit(1)
  return normalizeRole(row?.role)
}

/** Role + profile fields (phone, job title) for a user, in one query. */
export async function getUserProfile(
  userId: string,
  workspaceId?: string,
): Promise<{ role: WorkspaceRole; phone: string; jobTitle: string }> {
  const ws = workspaceId ?? (await resolveActingWorkspaceId(userId))
  const [row] = await db
    .select({ role: userTable.role, phone: userTable.phone, jobTitle: userTable.jobTitle })
    .from(userTable)
    .where(eq(userTable.id, userId))
    .limit(1)
  return {
    role: userId === ws ? "Owner" : normalizeRole(row?.role),
    phone: row?.phone ?? "",
    jobTitle: row?.jobTitle ?? "",
  }
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
  const role = await getUserRole(user.id, workspaceId)
  return { user, workspaceId, scopeIds, role }
}

/**
 * Throws unless the current user has one of the allowed roles. The workspace
 * Owner always passes (they can do anything an Admin/Member can).
 */
export async function requireRole(...roles: WorkspaceRole[]) {
  const acting = await getActingUser()
  if (acting.role !== "Owner" && !roles.includes(acting.role)) {
    throw new Error("You don't have permission to do this.")
  }
  return acting
}

/** Throws unless the current user is the workspace Owner (billing/ownership). */
export async function requireOwner() {
  const acting = await getActingUser()
  if (acting.role !== "Owner") {
    throw new Error("Only the account owner can do this.")
  }
  return acting
}
