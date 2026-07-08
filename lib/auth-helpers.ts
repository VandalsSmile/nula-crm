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

export type WorkspaceRole = "Admin" | "Manager" | "Staff" | "Viewer"
const VALID_ROLES: WorkspaceRole[] = ["Admin", "Manager", "Staff", "Viewer"]

export function normalizeRole(role: string | null | undefined): WorkspaceRole {
  if (!role) return "Staff"
  const match = VALID_ROLES.find((r) => r.toLowerCase() === role.trim().toLowerCase())
  return match ?? "Staff"
}

/**
 * Resolve a user's role. The workspace owner (whose id equals the workspace id)
 * is always Admin; everyone else uses their stored role.
 */
export async function getUserRole(userId: string, workspaceId?: string): Promise<WorkspaceRole> {
  const ws = workspaceId ?? (await resolveActingWorkspaceId(userId))
  if (userId === ws) return "Admin"
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
    role: userId === ws ? "Admin" : normalizeRole(row?.role),
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

/** Throws unless the current user has one of the allowed roles. */
export async function requireRole(...roles: WorkspaceRole[]) {
  const acting = await getActingUser()
  if (!roles.includes(acting.role)) {
    throw new Error("You don't have permission to do this.")
  }
  return acting
}
