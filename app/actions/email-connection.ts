"use server"

import crypto from "node:crypto"
import { and, eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"

import { db } from "@/lib/db"
import { emailConnections } from "@/lib/db/schema"
import { getActingUser } from "@/lib/auth-helpers"
import { randomId } from "@/lib/library-helpers"
import { dropboxAddressForToken, type EmailConnectionRow } from "@/lib/email/mailbox"
import { APP_ROUTES } from "@/lib/routes"

export type EmailConnection = {
  address: string
  ownedEmails: string[]
  mode: "contacts_only" | "all"
  createdAt: string
}

function toClient(row: EmailConnectionRow): EmailConnection {
  return {
    address: dropboxAddressForToken(row.token),
    ownedEmails: row.ownedEmails.split(",").map((e) => e.trim()).filter(Boolean),
    mode: row.mode === "all" ? "all" : "contacts_only",
    createdAt: row.createdAt.toISOString(),
  }
}

async function findForUser(userId: string): Promise<EmailConnectionRow | null> {
  const [row] = await db
    .select()
    .from(emailConnections)
    .where(eq(emailConnections.userId, userId))
    .limit(1)
  return row ?? null
}

export async function getMyEmailConnection(): Promise<EmailConnection | null> {
  const { user } = await getActingUser()
  const row = await findForUser(user.id)
  return row ? toClient(row) : null
}

/** Create the user's dropbox address (idempotent — returns the existing one). */
export async function connectMyEmail(): Promise<EmailConnection> {
  const { user, workspaceId } = await getActingUser()
  const existing = await findForUser(user.id)
  if (existing) return toClient(existing)

  const token = crypto.randomBytes(12).toString("hex")
  const [row] = await db
    .insert(emailConnections)
    .values({
      id: randomId("eml"),
      userId: user.id,
      workspaceId,
      token,
      ownedEmails: user.email?.trim().toLowerCase() ?? "",
      mode: "contacts_only",
    })
    .returning()

  revalidatePath(APP_ROUTES.settings)
  return toClient(row)
}

export async function updateMyEmailConnection(input: {
  mode?: "contacts_only" | "all"
  ownedEmails?: string[]
}): Promise<EmailConnection> {
  const { user } = await getActingUser()
  const existing = await findForUser(user.id)
  if (!existing) throw new Error("Connect your email first.")

  const patch: Partial<{ mode: string; ownedEmails: string }> = {}
  if (input.mode) patch.mode = input.mode === "all" ? "all" : "contacts_only"
  if (input.ownedEmails) {
    patch.ownedEmails = input.ownedEmails
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean)
      .join(",")
  }

  const [row] = await db
    .update(emailConnections)
    .set(patch)
    .where(and(eq(emailConnections.id, existing.id), eq(emailConnections.userId, user.id)))
    .returning()

  revalidatePath(APP_ROUTES.settings)
  return toClient(row)
}

export async function disconnectMyEmail(): Promise<{ ok: true }> {
  const { user } = await getActingUser()
  await db.delete(emailConnections).where(eq(emailConnections.userId, user.id))
  revalidatePath(APP_ROUTES.settings)
  return { ok: true }
}
