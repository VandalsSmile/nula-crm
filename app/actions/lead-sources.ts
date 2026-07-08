"use server"

import { getActingUser } from "@/lib/auth-helpers"
import { getLeadSourcesForWorkspace, getRecentLeadEvents } from "@/lib/leads/sources"

export type LeadSourceInfo = {
  id: string
  name: string
  channel: string
  key: string
  enabled: boolean
  createdAt: string
}

export type LeadEventInfo = {
  id: string
  channel: string
  status: string
  contactId: string | null
  createdAt: string
}

export async function getLeadSources(): Promise<LeadSourceInfo[]> {
  const { workspaceId } = await getActingUser()
  const rows = await getLeadSourcesForWorkspace(workspaceId)
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    channel: r.channel,
    key: r.key,
    enabled: r.enabled,
    createdAt: r.createdAt.toISOString(),
  }))
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
