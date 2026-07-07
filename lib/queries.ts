import { db } from "@/lib/db"
import { activities, clients } from "@/lib/db/schema"
import { and, desc, eq } from "drizzle-orm"
import { getWorkspaceScope, workspaceUserIdMatches } from "@/lib/auth-helpers"
import { mapActivity, mapClient } from "@/lib/mappers"
import type { Activity, Client } from "@/lib/mock-data"
import { getWorkspaceUserLabels } from "@/lib/workspace-users"

export async function getClients(): Promise<Client[]> {
  const { scopeIds } = await getWorkspaceScope()
  const rows = await db
    .select()
    .from(clients)
    .where(workspaceUserIdMatches(clients.userId, scopeIds))
    .orderBy(clients.name)
  return rows.map((row) => mapClient(row))
}

export async function getClientById(id: string): Promise<Client | null> {
  const { scopeIds } = await getWorkspaceScope()
  const [row] = await db
    .select()
    .from(clients)
    .where(and(eq(clients.id, id), workspaceUserIdMatches(clients.userId, scopeIds)))
    .limit(1)
  return row ? mapClient(row) : null
}

export async function getActivities(limit = 20): Promise<Activity[]> {
  const { workspaceId, scopeIds } = await getWorkspaceScope()
  const [rows, clientRows, labels] = await Promise.all([
    db
      .select()
      .from(activities)
      .where(workspaceUserIdMatches(activities.userId, scopeIds))
      .orderBy(desc(activities.at))
      .limit(limit),
    db.select({ id: clients.id, name: clients.name }).from(clients).where(workspaceUserIdMatches(clients.userId, scopeIds)),
    getWorkspaceUserLabels(workspaceId),
  ])

  const clientNames = new Map(clientRows.map((c) => [c.id, c.name]))
  return rows.map((row) => mapActivity(row, labels, clientNames.get(row.clientId) ?? ""))
}

export async function getDashboardStats() {
  const { scopeIds } = await getWorkspaceScope()
  const rows = await db
    .select({
      lacrmStatus: clients.lacrmStatus,
    })
    .from(clients)
    .where(workspaceUserIdMatches(clients.userId, scopeIds))

  return {
    totalClients: rows.length,
    lacrmConnected: rows.filter((r) => r.lacrmStatus === "Connected").length,
  }
}
