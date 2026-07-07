"use server"

import { revalidatePath } from "next/cache"
import { and, eq } from "drizzle-orm"

import { db } from "@/lib/db"
import { activities, clients } from "@/lib/db/schema"
import { getActingUser, workspaceUserIdMatches } from "@/lib/auth-helpers"
import { getWorkspaceScopeIds } from "@/lib/workspace-scope"
import { encryptIntegrationSecret } from "@/lib/integration-secrets"
import { randomId } from "@/lib/library-helpers"
import {
  contactsToRecipients,
  createLacrmNote,
  formatLacrmAccountName,
  LacrmApiError,
  listLacrmGroupContacts,
  listLacrmGroups,
  verifyLacrmApiKey,
} from "@/lib/lacrm"
import { getLacrmApiKeyForClient } from "@/lib/lacrm-credentials"

export type LacrmActionResult = {
  ok: boolean
  message: string
}

export type LacrmGroupOption = {
  id: string
  name: string
  contactCount: number | null
}

function normalizeApiKey(raw: string): string {
  return raw.trim()
}

async function requireClient(clientId: string, workspaceId: string) {
  const scopeIds = await getWorkspaceScopeIds(workspaceId)
  const [row] = await db
    .select({ id: clients.id, name: clients.name })
    .from(clients)
    .where(and(eq(clients.id, clientId), workspaceUserIdMatches(clients.userId, scopeIds)))
    .limit(1)
  if (!row) throw new Error("Client not found")
  return row
}

/** Store and validate a LACRM API key for a client workspace. */
export async function connectLacrm(clientId: string, apiKey: string): Promise<LacrmActionResult> {
  const { user, workspaceId, scopeIds } = await getActingUser()
  const client = await requireClient(clientId, workspaceId)

  const normalized = normalizeApiKey(apiKey)
  if (!normalized) {
    return { ok: false, message: "Enter a LACRM API key." }
  }

  try {
    const account = await verifyLacrmApiKey(normalized)
    const accountName = formatLacrmAccountName(account)
    const now = new Date()

    await db
      .update(clients)
      .set({
        lacrmApiKeyEnc: encryptIntegrationSecret(normalized),
        lacrmStatus: "Connected",
        lacrmConnectedBy: user.name,
        lacrmLastCheckedAt: now,
        lacrmAccountName: accountName,
        lacrmUserId: account.UserId,
      })
      .where(and(eq(clients.id, clientId), workspaceUserIdMatches(clients.userId, scopeIds)))

    await db.insert(activities).values({
      id: randomId("a"),
      userId: workspaceId,
      type: "connected",
      message: `connected Less Annoying CRM (${accountName}) to "${client.name}"`,
      clientId,
      actorId: user.id,
    })

    revalidatePath("/connections")
    revalidatePath("/dashboard")
    revalidatePath(`/clients/${clientId}`)

    return { ok: true, message: `Connected to ${accountName}.` }
  } catch (error) {
    const message =
      error instanceof LacrmApiError
        ? error.message
        : error instanceof Error
          ? error.message
          : "Could not connect to Less Annoying CRM."
    return { ok: false, message }
  }
}

/** Remove the stored LACRM API key for a client. */
export async function disconnectLacrm(clientId: string): Promise<void> {
  const { user, workspaceId, scopeIds } = await getActingUser()
  const client = await requireClient(clientId, workspaceId)

  await db
    .update(clients)
    .set({
      lacrmApiKeyEnc: null,
      lacrmStatus: "Disconnected",
      lacrmConnectedBy: "—",
      lacrmLastCheckedAt: null,
      lacrmAccountName: null,
      lacrmUserId: null,
    })
    .where(and(eq(clients.id, clientId), workspaceUserIdMatches(clients.userId, scopeIds)))

  await db.insert(activities).values({
    id: randomId("a"),
    userId: workspaceId,
    type: "connected",
    message: `disconnected Less Annoying CRM from "${client.name}"`,
    clientId,
    actorId: user.id,
  })

  revalidatePath("/connections")
  revalidatePath("/dashboard")
  revalidatePath(`/clients/${clientId}`)
}

/** Ping LACRM with the stored API key and refresh connection metadata. */
export async function testLacrmConnection(clientId: string): Promise<LacrmActionResult> {
  const { workspaceId, scopeIds } = await getActingUser()
  await requireClient(clientId, workspaceId)

  try {
    const apiKey = await getLacrmApiKeyForClient(clientId, workspaceId)
    const account = await verifyLacrmApiKey(apiKey)
    const accountName = formatLacrmAccountName(account)
    const now = new Date()

    await db
      .update(clients)
      .set({
        lacrmStatus: "Connected",
        lacrmLastCheckedAt: now,
        lacrmAccountName: accountName,
        lacrmUserId: account.UserId,
      })
      .where(and(eq(clients.id, clientId), workspaceUserIdMatches(clients.userId, scopeIds)))

    revalidatePath("/connections")
    revalidatePath("/dashboard")
    revalidatePath(`/clients/${clientId}`)
    return { ok: true, message: `Less Annoying CRM connection is healthy (${accountName}).` }
  } catch (error) {
    const message =
      error instanceof LacrmApiError
        ? error.message
        : error instanceof Error
          ? error.message
          : "Could not reach Less Annoying CRM."

    await db
      .update(clients)
      .set({
        lacrmStatus: "Failed",
        lacrmLastCheckedAt: new Date(),
      })
      .where(and(eq(clients.id, clientId), workspaceUserIdMatches(clients.userId, scopeIds)))

    revalidatePath("/connections")
    revalidatePath(`/clients/${clientId}`)
    return { ok: false, message }
  }
}

/** List LACRM groups for the email audience picker. */
export async function listClientLacrmGroups(clientId: string): Promise<LacrmGroupOption[]> {
  const { workspaceId, scopeIds } = await getActingUser()
  await requireClient(clientId, workspaceId)

  const apiKey = await getLacrmApiKeyForClient(clientId, workspaceId)
  const groups = await listLacrmGroups(apiKey)

  return groups
    .map((group) => ({
      id: group.GroupId,
      name: group.Name?.trim() || "Untitled group",
      contactCount:
        typeof group.NumberOfContacts === "number" ? group.NumberOfContacts : null,
    }))
    .sort((a, b) => a.name.localeCompare(b.name))
}

/** Count deliverable email addresses in a LACRM group. */
export async function getLacrmGroupRecipientCount(
  clientId: string,
  groupId: string,
): Promise<{ count: number; groupName: string }> {
  const { workspaceId, scopeIds } = await getActingUser()
  await requireClient(clientId, workspaceId)

  const apiKey = await getLacrmApiKeyForClient(clientId, workspaceId)
  const groups = await listLacrmGroups(apiKey)
  const group = groups.find((entry) => entry.GroupId === groupId)
  const contacts = await listLacrmGroupContacts(apiKey, groupId)
  const recipients = contactsToRecipients(contacts)

  return {
    count: recipients.length,
    groupName: group?.Name?.trim() || "Selected group",
  }
}
