"use server"

import { revalidatePath } from "next/cache"

import { getActingUser, requireRole } from "@/lib/auth-helpers"
import {
  createLeadSource,
  getLeadSourcesForWorkspace,
  getRecentLeadEvents,
} from "@/lib/leads/sources"

function appBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    process.env.BETTER_AUTH_URL?.replace(/\/$/, "") ||
    "https://www.nulacrm.ai"
  )
}

function endpointFor(publicKey: string): string {
  return publicKey ? `${appBaseUrl()}/api/lead/${publicKey}` : ""
}

const INBOUND_EMAIL_DOMAIN = process.env.INBOUND_EMAIL_DOMAIN?.trim() || "inbox.nulacrm.ai"

function inboundAddressFor(publicKey: string): string {
  return publicKey ? `leads+${publicKey}@${INBOUND_EMAIL_DOMAIN}` : ""
}

export type LeadSourceInfo = {
  id: string
  name: string
  channel: string
  key: string
  enabled: boolean
  publicKey: string
  endpointUrl: string
  inboundAddress: string
  successMessage: string
  createdAt: string
}

export type LeadEventInfo = {
  id: string
  channel: string
  status: string
  contactId: string | null
  createdAt: string
}

function toInfo(r: Awaited<ReturnType<typeof getLeadSourcesForWorkspace>>[number]): LeadSourceInfo {
  return {
    id: r.id,
    name: r.name,
    channel: r.channel,
    key: r.key,
    enabled: r.enabled,
    publicKey: r.publicKey,
    endpointUrl: endpointFor(r.publicKey),
    inboundAddress: inboundAddressFor(r.publicKey),
    successMessage: r.successMessage,
    createdAt: r.createdAt.toISOString(),
  }
}

export async function getLeadSources(): Promise<LeadSourceInfo[]> {
  const { workspaceId } = await getActingUser()
  const rows = await getLeadSourcesForWorkspace(workspaceId)
  return rows.map(toInfo)
}

export async function createWebFormSource(input: {
  name: string
  successMessage?: string
  redirectUrl?: string
}): Promise<LeadSourceInfo> {
  const { workspaceId } = await requireRole("Admin")
  const name = input.name.trim()
  if (!name) throw new Error("Source name is required")
  const row = await createLeadSource(workspaceId, {
    name,
    channel: "web_form",
    successMessage: input.successMessage?.trim() || "",
    redirectUrl: input.redirectUrl?.trim() || "",
  })
  revalidatePath("/app/settings")
  return toInfo(row)
}

export async function createEmailSource(input: { name: string }): Promise<LeadSourceInfo> {
  const { workspaceId } = await requireRole("Admin")
  const name = input.name.trim()
  if (!name) throw new Error("Source name is required")
  const row = await createLeadSource(workspaceId, { name, channel: "email" })
  revalidatePath("/app/settings")
  return toInfo(row)
}

export async function getLeadEvents(): Promise<LeadEventInfo[]> {
  const { workspaceId } = await getActingUser()
  const rows = await getRecentLeadEvents(workspaceId, 25)
  return rows.map((r) => ({
    id: r.id,
    channel: r.channel,
    status: r.status,
    contactId: r.contactId ?? null,
    createdAt: r.createdAt.toISOString(),
  }))
}
