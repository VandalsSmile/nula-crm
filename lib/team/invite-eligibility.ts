export type InviteBlock = "already_member" | "other_workspace" | null

/**
 * Decide whether an email that already has a Nula account may be invited to a
 * workspace.
 *
 * A person owns exactly one workspace (their own) or is a member of a shared
 * one. A "solo/detached" account — no workspace bound, or one that points at
 * its own id (a self-serve signup, or a teammate who was removed and reverted
 * to their own account) — can be (re-)invited; accepting rebinds them to the
 * inviting workspace. Only an active member of a *different* shared workspace is
 * blocked, since pulling them in would abandon that workspace's membership.
 *
 * Returns the reason to block, or null when the invite is allowed.
 */
export function inviteBlockReason(
  existingUser: { id: string; workspaceId: string | null } | undefined | null,
  workspaceId: string,
): InviteBlock {
  if (!existingUser) return null
  // The owner of this workspace (their id is the workspace id) is already on it,
  // even when their own workspaceId column was never self-set.
  if (existingUser.id === workspaceId) return "already_member"

  const boundWorkspace = existingUser.workspaceId?.trim() || ""
  if (boundWorkspace === workspaceId) return "already_member"

  // Solo/detached: unbound, or owns only their own workspace.
  if (!boundWorkspace || boundWorkspace === existingUser.id) return null

  // Active member of a different shared workspace.
  return "other_workspace"
}
