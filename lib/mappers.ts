import type { Activity, Client } from "@/lib/mock-data"
import type { activities, clients } from "@/lib/db/schema"
import { labelForUserId, type UserLabelMap } from "@/lib/workspace-users"

type ClientRow = typeof clients.$inferSelect
type ActivityRow = typeof activities.$inferSelect

const iso = (d: Date | null | undefined) => (d ? d.toISOString() : null)

export function mapClient(row: ClientRow): Client {
  return {
    id: row.id,
    name: row.name,
    websiteUrl: row.websiteUrl,
    contactName: row.contactName,
    contactEmail: row.contactEmail,
    phone: row.phone,
    location: row.location,
    timezone: row.timezone,
    industry: row.industry,
    accentColor: row.accentColor,
    logoUrl: row.logoUrl,
    brandVoice: row.brandVoice,
    targetAudience: row.targetAudience,
    commonServices: row.commonServices,
    notes: row.notes,
    lacrm: {
      status: row.lacrmStatus as Client["lacrm"]["status"],
      connectedBy: row.lacrmConnectedBy,
      lastCheckedAt: iso(row.lacrmLastCheckedAt) ?? "",
      accountName: row.lacrmAccountName ?? "",
    },
    createdAt: iso(row.createdAt) ?? "",
  }
}

export function mapActivity(
  row: ActivityRow,
  labels: UserLabelMap,
  clientName = "",
): Activity {
  return {
    id: row.id,
    type: row.type,
    message: row.message,
    clientId: row.clientId,
    clientName,
    actorName: labelForUserId(labels, row.actorId),
    at: iso(row.at) ?? "",
  }
}
