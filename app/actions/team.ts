"use server"

import crypto from "node:crypto"
import { and, desc, eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { teamInvites, user as userTable } from "@/lib/db/schema"
import { getActingUser } from "@/lib/auth-helpers"
import { APP_ROUTES } from "@/lib/routes"

const INVITE_TTL_DAYS = 14

export type TeamInvite = {
  id: string
  email: string
  role: string
  status: string
  invitedByName: string
  createdAt: string
  expiresAt: string
  expired: boolean
  url: string
}

export type TeamMember = {
  id: string
  name: string
  email: string
  image: string | null
  isOwner: boolean
  isYou: boolean
}

/** Absolute origin for building shareable invite links. */
async function getOrigin(): Promise<string> {
  const h = await headers()
  const explicit = process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_APP_URL
  if (explicit) return explicit.replace(/\/$/, "")
  const proto = h.get("x-forwarded-proto") ?? "https"
  const host = h.get("x-forwarded-host") ?? h.get("host")
  return `${proto}://${host}`
}

function inviteUrl(origin: string, token: string): string {
  return `${origin}/accept-invite/${token}`
}

function mapInvite(
  row: typeof teamInvites.$inferSelect,
  origin: string,
): TeamInvite {
  return {
    id: row.id,
    email: row.email,
    role: row.role,
    status: row.status,
    invitedByName: row.invitedByName,
    createdAt: row.createdAt.toISOString(),
    expiresAt: row.expiresAt.toISOString(),
    expired: row.status === "Pending" && row.expiresAt.getTime() < Date.now(),
    url: inviteUrl(origin, row.id),
  }
}

/**
 * Create a teammate invite for the current workspace and return a shareable
 * URL. Re-invoking for an email with a live pending invite returns that same
 * invite (revoking the old token would break links already sent).
 */
export async function createTeamInvite(emailInput: string): Promise<TeamInvite> {
  const { user, workspaceId } = await getActingUser()

  const email = emailInput.trim().toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Enter a valid email address.")
  }

  // Already a member of this workspace?
  const [existingUser] = await db
    .select({ id: userTable.id, workspaceId: userTable.workspaceId })
    .from(userTable)
    .where(eq(userTable.email, email))
    .limit(1)
  if (existingUser?.workspaceId === workspaceId) {
    throw new Error("That person is already on your team.")
  }
  if (existingUser) {
    throw new Error("That email already belongs to another account.")
  }

  const origin = await getOrigin()

  // Reuse a live pending invite so previously-sent links keep working.
  const [pending] = await db
    .select()
    .from(teamInvites)
    .where(
      and(
        eq(teamInvites.workspaceId, workspaceId),
        eq(teamInvites.email, email),
        eq(teamInvites.status, "Pending"),
      ),
    )
    .limit(1)
  if (pending && pending.expiresAt.getTime() > Date.now()) {
    return mapInvite(pending, origin)
  }
  // Expired pending invite: revoke it before issuing a fresh one.
  if (pending) {
    await db.update(teamInvites).set({ status: "Revoked" }).where(eq(teamInvites.id, pending.id))
  }

  const token = `tinv_${crypto.randomBytes(24).toString("hex")}`
  const expiresAt = new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000)

  const [row] = await db
    .insert(teamInvites)
    .values({
      id: token,
      workspaceId,
      email,
      role: "admin",
      status: "Pending",
      invitedByUserId: user.id,
      invitedByName: user.name,
      expiresAt,
    })
    .returning()

  revalidatePath(APP_ROUTES.settings)
  return mapInvite(row, origin)
}

/** All invites for the current workspace, newest first. */
export async function listTeamInvites(): Promise<TeamInvite[]> {
  const { workspaceId } = await getActingUser()
  const origin = await getOrigin()
  const rows = await db
    .select()
    .from(teamInvites)
    .where(eq(teamInvites.workspaceId, workspaceId))
    .orderBy(desc(teamInvites.createdAt))
  return rows.map((r) => mapInvite(r, origin))
}

/** Current members of the workspace (owner + accepted invitees). */
export async function listTeamMembers(): Promise<TeamMember[]> {
  const { user, workspaceId } = await getActingUser()
  const rows = await db
    .select({
      id: userTable.id,
      name: userTable.name,
      email: userTable.email,
      image: userTable.image,
    })
    .from(userTable)
    .where(eq(userTable.workspaceId, workspaceId))
  return rows
    .map((r) => ({
      id: r.id,
      name: r.name,
      email: r.email,
      image: r.image,
      isOwner: r.id === workspaceId,
      isYou: r.id === user.id,
    }))
    .sort((a, b) => Number(b.isOwner) - Number(a.isOwner))
}

/** Revoke a pending invite so its link can no longer be used. */
export async function revokeTeamInvite(token: string): Promise<void> {
  const { workspaceId } = await getActingUser()
  await db
    .update(teamInvites)
    .set({ status: "Revoked" })
    .where(and(eq(teamInvites.id, token), eq(teamInvites.workspaceId, workspaceId)))
  revalidatePath(APP_ROUTES.settings)
}

export type InviteLookup =
  | { ok: true; email: string; invitedByName: string; workspaceId: string }
  | { ok: false; reason: "not_found" | "revoked" | "accepted" | "expired" }

/**
 * Public, unauthenticated lookup used by the accept-invite page to show who
 * invited the user and prefill their email. Token acts as the bearer secret.
 */
export async function lookupTeamInvite(token: string): Promise<InviteLookup> {
  const [row] = await db.select().from(teamInvites).where(eq(teamInvites.id, token)).limit(1)
  if (!row) return { ok: false, reason: "not_found" }
  if (row.status === "Revoked") return { ok: false, reason: "revoked" }
  if (row.status === "Accepted") return { ok: false, reason: "accepted" }
  if (row.expiresAt.getTime() < Date.now()) return { ok: false, reason: "expired" }
  return { ok: true, email: row.email, invitedByName: row.invitedByName, workspaceId: row.workspaceId }
}

/**
 * Finalize an invite after the user has signed up. Better Auth's invite-only
 * `before` hook already verified the email had a pending invite; here we bind
 * the brand-new user to the inviting workspace and mark the invite accepted.
 * Called from the accept-invite client right after signUp succeeds.
 */
export async function acceptTeamInvite(token: string): Promise<{ ok: boolean }> {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) throw new Error("You must be signed in to accept an invite.")
  const acting = session.user

  const [invite] = await db.select().from(teamInvites).where(eq(teamInvites.id, token)).limit(1)
  if (!invite) throw new Error("This invite no longer exists.")
  if (invite.status === "Revoked") throw new Error("This invite has been revoked.")
  if (invite.status === "Accepted") {
    // Idempotent: if it's already this user, treat as success.
    if (invite.acceptedByUserId === acting.id) return { ok: true }
    throw new Error("This invite has already been used.")
  }
  if (invite.expiresAt.getTime() < Date.now()) throw new Error("This invite has expired.")
  if (invite.email.toLowerCase() !== acting.email.toLowerCase()) {
    throw new Error("This invite was issued for a different email address.")
  }

  // Bootstrap owner invite uses workspaceId "__bootstrap__". The first accepted
  // invite becomes the workspace owner and inherits their user id as workspaceId.
  let workspaceId = invite.workspaceId
  if (workspaceId === "__bootstrap__") {
    workspaceId = acting.id
    await db.update(teamInvites).set({ workspaceId: acting.id }).where(eq(teamInvites.id, token))
  }

  // Bind the new user to the inviting workspace (shared data) and close the invite.
  await db.update(userTable).set({ workspaceId }).where(eq(userTable.id, acting.id))
  await db
    .update(teamInvites)
    .set({ status: "Accepted", acceptedAt: new Date(), acceptedByUserId: acting.id })
    .where(eq(teamInvites.id, token))

  revalidatePath("/", "layout")
  return { ok: true }
}
