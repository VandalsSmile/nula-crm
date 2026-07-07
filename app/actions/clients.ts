"use server"

import { db } from "@/lib/db"
import { clients, activities } from "@/lib/db/schema"
import { and, eq } from "drizzle-orm"
import { put, del } from "@vercel/blob"
import { revalidatePath } from "next/cache"
import { getActingUser, workspaceUserIdMatches } from "@/lib/auth-helpers"
import { randomId } from "@/lib/library-helpers"
import { mapClient } from "@/lib/mappers"
import { fetchBrand, type BrandResult } from "@/lib/brand-fetch"
import type { Client } from "@/lib/mock-data"

function extForContentType(contentType: string): string {
  if (contentType.includes("svg")) return ".svg"
  if (contentType.includes("png")) return ".png"
  if (contentType.includes("jpeg") || contentType.includes("jpg")) return ".jpg"
  if (contentType.includes("webp")) return ".webp"
  if (contentType.includes("x-icon") || contentType.includes("vnd.microsoft.icon")) return ".ico"
  if (contentType.includes("gif")) return ".gif"
  return ".img"
}

export async function fetchBrandFromUrl(url: string): Promise<BrandResult> {
  await getActingUser()
  if (!url?.trim()) throw new Error("A URL is required")

  return fetchBrand(url, async (buffer, contentType) => {
    const blob = await put(`library/logos/${randomId("logo")}${extForContentType(contentType)}`, buffer, {
      access: "public",
      contentType: contentType || undefined,
    })
    return blob.url
  })
}

export type ClientInput = {
  name: string
  websiteUrl?: string
  contactName?: string
  contactEmail?: string
  phone?: string
  location?: string
  timezone?: string
  industry?: string
  accentColor?: string
  logoUrl?: string | null
  brandVoice?: string
  targetAudience?: string
  commonServices?: string
  notes?: string
}

export async function createClient(input: ClientInput): Promise<Client> {
  const { user, workspaceId } = await getActingUser()
  if (!input.name?.trim()) throw new Error("A client name is required")

  const [row] = await db
    .insert(clients)
    .values({
      id: randomId("c"),
      userId: workspaceId,
      name: input.name.trim(),
      websiteUrl: input.websiteUrl ?? "",
      contactName: input.contactName ?? "",
      contactEmail: input.contactEmail ?? "",
      phone: input.phone ?? "",
      location: input.location ?? "",
      timezone: input.timezone ?? "America/New_York",
      industry: input.industry ?? "",
      accentColor: input.accentColor || "oklch(0.6 0.16 250)",
      logoUrl: input.logoUrl ?? null,
      brandVoice: input.brandVoice ?? "",
      targetAudience: input.targetAudience ?? "",
      commonServices: input.commonServices ?? "",
      notes: input.notes ?? "",
      lacrmConnectedBy: user.name,
    })
    .returning()

  await db.insert(activities).values({
    id: randomId("a"),
    userId: workspaceId,
    type: "created",
    message: `added client "${input.name.trim()}"`,
    clientId: row.id,
    actorId: user.id,
  })

  revalidatePath("/clients")
  revalidatePath("/dashboard")
  return mapClient(row)
}

export async function updateClient(id: string, input: Partial<ClientInput>): Promise<Client> {
  const { scopeIds } = await getActingUser()

  const patch: Record<string, string | null> = {}
  for (const [key, value] of Object.entries(input)) {
    if (value !== undefined) patch[key] = value as string | null
  }

  const [row] = await db
    .update(clients)
    .set(patch)
    .where(and(eq(clients.id, id), workspaceUserIdMatches(clients.userId, scopeIds)))
    .returning()
  if (!row) throw new Error("Client not found")

  revalidatePath("/clients")
  revalidatePath(`/clients/${id}`)
  return mapClient(row)
}

export async function deleteClient(id: string): Promise<void> {
  const { scopeIds } = await getActingUser()

  const [client] = await db
    .select({ id: clients.id, logoUrl: clients.logoUrl })
    .from(clients)
    .where(and(eq(clients.id, id), workspaceUserIdMatches(clients.userId, scopeIds)))
    .limit(1)
  if (!client) throw new Error("Client not found")

  if (client.logoUrl?.startsWith("http")) {
    try {
      await del(client.logoUrl)
    } catch (err) {
      console.log("[nula-crm] deleteClient blob cleanup failed:", err instanceof Error ? err.message : err)
    }
  }

  await db.delete(activities).where(and(eq(activities.clientId, id), workspaceUserIdMatches(activities.userId, scopeIds)))
  await db.delete(clients).where(and(eq(clients.id, id), workspaceUserIdMatches(clients.userId, scopeIds)))

  revalidatePath("/clients")
  revalidatePath("/dashboard")
}
