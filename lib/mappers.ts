import type {
  Activity,
  Campaign,
  CampaignStatus,
  CampaignType,
  Company,
  Contact,
  CustomerStatus,
  Deal,
  DealStage,
  Group,
  LeadStatus,
  LifecycleStage,
  Tag,
} from "@/lib/crm-types"
import { contactFullName } from "@/lib/crm-types"
import type {
  activities,
  campaigns,
  companies,
  contacts,
  deals,
  groups,
  tags,
} from "@/lib/db/schema"
import { labelForUserId, type UserLabelMap } from "@/lib/workspace-users"

const iso = (d: Date | null | undefined) => (d ? d.toISOString() : null)

type ContactRow = typeof contacts.$inferSelect
type CompanyRow = typeof companies.$inferSelect
type TagRow = typeof tags.$inferSelect
type GroupRow = typeof groups.$inferSelect
type ActivityRow = typeof activities.$inferSelect
type DealRow = typeof deals.$inferSelect
type CampaignRow = typeof campaigns.$inferSelect

export function mapTag(row: TagRow): Tag {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    color: row.color,
    description: row.description,
  }
}

export function mapCompany(row: CompanyRow, contactCount = 0): Company {
  return {
    id: row.id,
    name: row.name,
    website: row.website,
    phone: row.phone,
    address: row.address,
    city: row.city,
    state: row.state,
    zip: row.zip,
    notes: row.notes,
    contactCount,
    createdAt: iso(row.createdAt) ?? "",
  }
}

export function mapGroup(row: GroupRow, memberCount = 0): Group {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    type: row.type,
    isSystem: row.isSystem,
    memberCount,
  }
}

export function mapContact(
  row: ContactRow,
  extra: { tags?: Tag[]; groups?: Group[]; ownerName?: string } = {},
): Contact {
  // When a structured first name is present, trust the stored last name verbatim
  // (including an intentionally empty one). Only fall back to deriving first/last
  // from the combined `name`/legacy fields for legacy rows that never had a
  // structured first name — otherwise an empty last name would appear "auto-filled".
  const hasStructuredName = Boolean(row.firstName)
  const firstName = row.firstName || row.legacyContactName?.split(" ")[0] || row.name || ""
  const lastName = hasStructuredName
    ? row.lastName
    : row.lastName ||
      row.legacyContactName?.split(" ").slice(1).join(" ") ||
      row.name?.split(" ").slice(1).join(" ") ||
      ""

  // Fall back to the company name for company-only contacts (cold outreach where
  // the person's name isn't known yet).
  const fullName =
    firstName || lastName ? contactFullName(firstName, lastName) : row.companyName || "Unnamed contact"

  return {
    id: row.id,
    firstName,
    lastName,
    fullName,
    companyName: row.companyName,
    companyId: row.companyId,
    ownerId: row.ownerId,
    ownerName: extra.ownerName ?? "",
    email: row.email,
    phone: row.phone,
    websiteUrl: row.websiteUrl,
    address: row.address,
    city: row.city,
    state: row.state,
    zip: row.zip,
    source: row.source,
    lifecycleStage: row.lifecycleStage as LifecycleStage,
    leadStatus: row.leadStatus as LeadStatus,
    customerStatus: row.customerStatus as CustomerStatus,
    notes: row.notes,
    lastContactedAt: iso(row.lastContactedAt),
    lastActivityAt: iso(row.lastActivityAt),
    lastPurchaseAt: iso(row.lastPurchaseAt),
    totalRevenueCents: row.totalRevenueCents,
    productsPurchased: row.productsPurchased,
    communicationPreference: row.communicationPreference,
    optInStatus: row.optInStatus,
    leadScore: row.leadScore,
    aiSummary: row.aiSummary,
    recommendedNextAction: row.recommendedNextAction,
    tags: extra.tags ?? [],
    groups: extra.groups ?? [],
    createdAt: iso(row.createdAt) ?? "",
  }
}

export function mapActivity(
  row: ActivityRow,
  labels: UserLabelMap,
  contactName = "",
): Activity {
  return {
    id: row.id,
    type: row.type,
    message: row.message,
    contactId: row.contactId,
    contactName,
    actorName: labelForUserId(labels, row.actorId),
    at: iso(row.at) ?? "",
  }
}

export function mapDeal(row: DealRow, contactName: string): Deal {
  return {
    id: row.id,
    contactId: row.contactId,
    contactName,
    title: row.title,
    offerInterest: row.offerInterest,
    stage: row.stage as DealStage,
    estimatedValueCents: row.estimatedValueCents,
    probability: row.probability,
    nextStep: row.nextStep,
    ownerId: row.ownerId,
    closeDate: iso(row.closeDate),
  }
}

export function mapCampaign(row: CampaignRow): Campaign {
  return {
    id: row.id,
    name: row.name,
    type: row.type as CampaignType,
    status: row.status as CampaignStatus,
    goal: row.goal,
    audience: row.audience,
    groupId: row.groupId,
    sequence: (row.sequence ?? []) as Campaign["sequence"],
    createdAt: iso(row.createdAt) ?? "",
  }
}
