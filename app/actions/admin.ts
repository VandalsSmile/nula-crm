"use server"

import crypto from "node:crypto"
import { desc, eq, sql } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { headers } from "next/headers"

import { db } from "@/lib/db"
import { contacts, teamInvites, user as userTable, workspaceSettings } from "@/lib/db/schema"
import { requireSuperAdmin } from "@/lib/superadmin"
import { computeTrialStatus, trialEndDate } from "@/lib/trial"

export type AdminAccount = {
  workspaceId: string
  ownerName: string
  ownerEmail: string
  company: string
  plan: string
  planLabel: string
  trialDaysLeft: number
  trialExpired: boolean
  subscriptionStatus: string
  suspended: boolean
  members: number
  contacts: number
  createdAt: string
}

export type ProspectInvite = {
  id: string
  email: string
  status: string
  expired: boolean
  createdAt: string
  url: string
}

async function origin(): Promise<string> {
  const explicit = process.env.NEXT_PUBLIC_APP_URL || process.env.BETTER_AUTH_URL
  if (explicit) return explicit.replace(/\/$/, "")
  const h = await headers()
  const proto = h.get("x-forwarded-proto") ?? "https"
  const host = h.get("x-forwarded-host") ?? h.get("host")
  return `${proto}://${host}`
}

function planLabel(plan: string): string {
  if (plan === "free") return "Free (comp)"
  if (plan === "active") return "Paid"
  if (plan === "canceled") return "Canceled"
  return "Trial"
}

/** All customer accounts (workspaces) with plan + usage, for the console. */
export async function getAccounts(): Promise<AdminAccount[]> {
  await requireSuperAdmin()

  const [users, settings, contactCounts] = await Promise.all([
    db
      .select({
        id: userTable.id,
        name: userTable.name,
        email: userTable.email,
        workspaceId: userTable.workspaceId,
        createdAt: userTable.createdAt,
      })
      .from(userTable),
    db.select().from(workspaceSettings),
    db
      .select({ userId: contacts.userId, count: sql<number>`count(*)::int` })
      .from(contacts)
      .groupBy(contacts.userId),
  ])

  const settingsByWs = new Map(settings.map((s) => [s.workspaceId, s]))
  const contactsByWs = new Map(contactCounts.map((c) => [c.userId, c.count]))

  // Owners = users whose effective workspace is their own id.
  const owners = users.filter((u) => !u.workspaceId || u.workspaceId === u.id)

  return owners
    .map((owner) => {
      const s = settingsByWs.get(owner.id)
      const members = users.filter((u) => u.id === owner.id || u.workspaceId === owner.id).length
      const trial = computeTrialStatus(s?.plan ?? "trial", s?.trialEndsAt ?? null)
      return {
        workspaceId: owner.id,
        ownerName: owner.name,
        ownerEmail: owner.email,
        company: s?.companyName ?? "",
        plan: s?.plan ?? "trial",
        planLabel: planLabel(s?.plan ?? "trial"),
        trialDaysLeft: trial.daysLeft,
        trialExpired: trial.isExpired,
        subscriptionStatus: s?.subscriptionStatus ?? "",
        suspended: s?.suspended ?? false,
        members,
        contacts: contactsByWs.get(owner.id) ?? 0,
        createdAt: owner.createdAt.toISOString(),
      }
    })
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
}

async function upsertSettings(workspaceId: string, set: Record<string, unknown>) {
  await db
    .insert(workspaceSettings)
    .values({ workspaceId, ...set })
    .onConflictDoUpdate({
      target: workspaceSettings.workspaceId,
      set: { ...set, updatedAt: new Date() },
    })
  revalidatePath("/dashboard")
}

/** Set an account's plan: "free" (no charge), "trial", or "active" (paid). */
export async function setAccountPlan(workspaceId: string, plan: "free" | "trial" | "active") {
  await requireSuperAdmin()
  if (plan === "trial") {
    await upsertSettings(workspaceId, { plan: "trial", trialEndsAt: trialEndDate() })
  } else {
    await upsertSettings(workspaceId, { plan })
  }
}

/** Extend/reset the trial to end `days` from now. */
export async function setTrialDays(workspaceId: string, days: number) {
  await requireSuperAdmin()
  const clamped = Math.max(0, Math.min(365, Math.round(days)))
  await upsertSettings(workspaceId, {
    plan: "trial",
    trialEndsAt: new Date(Date.now() + clamped * 24 * 60 * 60 * 1000),
  })
}

export async function setSuspended(workspaceId: string, suspended: boolean) {
  await requireSuperAdmin()
  await upsertSettings(workspaceId, { suspended })
}

/** Create a prospect invite — a link that spins up a brand-new trial account. */
export async function createProspectInvite(emailInput: string): Promise<ProspectInvite> {
  const admin = await requireSuperAdmin()
  const email = emailInput.trim().toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Enter a valid email address.")
  }

  const [existing] = await db
    .select({ id: userTable.id })
    .from(userTable)
    .where(eq(userTable.email, email))
    .limit(1)
  if (existing) throw new Error("An account already exists for that email.")

  const token = `tinv_${crypto.randomBytes(24).toString("hex")}`
  const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
  const [row] = await db
    .insert(teamInvites)
    .values({
      id: token,
      // Bootstrap marker: the first acceptance becomes a new workspace owner.
      workspaceId: "__bootstrap__",
      email,
      role: "Admin",
      status: "Pending",
      kind: "prospect",
      invitedByUserId: admin.id,
      invitedByName: "Nula",
      expiresAt,
    })
    .returning()

  revalidatePath("/dashboard")
  return {
    id: row.id,
    email: row.email,
    status: row.status,
    expired: false,
    createdAt: row.createdAt.toISOString(),
    url: `${await origin()}/accept-invite/${row.id}`,
  }
}

export async function listProspectInvites(): Promise<ProspectInvite[]> {
  await requireSuperAdmin()
  const rows = await db
    .select()
    .from(teamInvites)
    .where(eq(teamInvites.kind, "prospect"))
    .orderBy(desc(teamInvites.createdAt))
  const base = await origin()
  return rows.map((r) => ({
    id: r.id,
    email: r.email,
    status: r.status,
    expired: r.status === "Pending" && r.expiresAt.getTime() < Date.now(),
    createdAt: r.createdAt.toISOString(),
    url: `${base}/accept-invite/${r.id}`,
  }))
}

export async function revokeProspectInvite(token: string) {
  await requireSuperAdmin()
  await db
    .update(teamInvites)
    .set({ status: "Revoked" })
    .where(eq(teamInvites.id, token))
  revalidatePath("/dashboard")
}
