/**
 * Workspace roles for multi-user accounts.
 *
 * - Owner: the account holder (exactly one per workspace — the user whose id
 *   equals the workspace id). Full access, including billing and account
 *   ownership. Derived, never assigned.
 * - Admin: manage the team, settings, and all CRM data. No billing.
 * - Member: everyday CRM work (contacts, deals, campaigns, inbox, AI).
 *
 * Roles are pure/shared so both client and server can import them.
 */
export type WorkspaceRole = "Owner" | "Admin" | "Member"

export const ROLE_RANK: Record<WorkspaceRole, number> = {
  Owner: 3,
  Admin: 2,
  Member: 1,
}

/** Roles an Owner/Admin can assign to a teammate (Owner is not assignable). */
export const ASSIGNABLE_ROLES: WorkspaceRole[] = ["Admin", "Member"]

export const ROLE_LABELS: Record<WorkspaceRole, string> = {
  Owner: "Owner",
  Admin: "Admin",
  Member: "Member",
}

export const ROLE_DESCRIPTIONS: Record<WorkspaceRole, string> = {
  Owner: "Full access, including billing and account ownership.",
  Admin: "Manage the team, settings, and all CRM data.",
  Member: "Work with contacts, deals, campaigns, and the inbox.",
}

/**
 * Normalize a stored/legacy role string to a current role. Legacy values
 * (Manager, Staff, Viewer) collapse to Member — least privilege — and can be
 * re-promoted by an Owner/Admin.
 */
export function normalizeRole(role: string | null | undefined): WorkspaceRole {
  switch ((role ?? "").trim().toLowerCase()) {
    case "owner":
      return "Owner"
    case "admin":
      return "Admin"
    default:
      return "Member"
  }
}

export function canManageTeam(role: WorkspaceRole): boolean {
  return role === "Owner" || role === "Admin"
}

export function canManageSettings(role: WorkspaceRole): boolean {
  return role === "Owner" || role === "Admin"
}

/** Billing / subscription / ownership actions are Owner-only. */
export function isBillingManager(role: WorkspaceRole): boolean {
  return role === "Owner"
}

/**
 * Whether `actor` may change the role of / remove `target`.
 * - The Owner is untouchable, and no one manages themselves here.
 * - Only the Owner may manage other Admins.
 */
export function canManageMember(params: {
  actorRole: WorkspaceRole
  targetRole: WorkspaceRole
  isSelf: boolean
  targetIsOwner: boolean
}): boolean {
  const { actorRole, targetRole, isSelf, targetIsOwner } = params
  if (targetIsOwner || isSelf) return false
  if (!canManageTeam(actorRole)) return false
  if (targetRole === "Admin" && actorRole !== "Owner") return false
  return true
}
