import "server-only"

import { getSessionUser } from "@/lib/auth-helpers"

/**
 * Platform super‑admins (Nula staff) who can access the system console at
 * /dashboard and manage all customer accounts. Configured via env so it can't
 * be self‑granted: NULA_SUPERADMIN_EMAILS="a@nula.ai,b@nula.ai".
 */
export function superAdminEmails(): string[] {
  return (process.env.NULA_SUPERADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
}

export function isSuperAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false
  return superAdminEmails().includes(email.trim().toLowerCase())
}

/** The signed-in user if they're a super-admin, otherwise null. */
export async function getSuperAdmin() {
  const user = await getSessionUser()
  if (!user || !isSuperAdminEmail(user.email)) return null
  return user
}

/** Throws unless the caller is a platform super-admin. */
export async function requireSuperAdmin() {
  const admin = await getSuperAdmin()
  if (!admin) throw new Error("You don't have access to the system console.")
  return admin
}
