export const LIFECYCLE_STAGES = [
  "New Lead",
  "Contacted",
  "Interested",
  "Booked",
  "Customer",
  "Repeat Customer",
  "Inactive Customer",
  "Lost / Unqualified",
] as const

export type LifecycleStage = (typeof LIFECYCLE_STAGES)[number]

export const LEAD_STATUSES = ["Open", "Working", "Qualified", "Unqualified", "Converted"] as const
export type LeadStatus = (typeof LEAD_STATUSES)[number]

/** Lead routing / segmentation rules (Lead Integration module, Phase 2). */
export type RoutingConditions = {
  channel?: string
  sourceKey?: string
  minScore?: number
  keywords?: string[]
}

export type RoutingActions = {
  addTags?: string[]
  addGroups?: string[]
  setLeadStatus?: string
  setLifecycle?: string
}

export type RoutingRule = {
  id: string
  name: string
  priority: number
  enabled: boolean
  conditions: RoutingConditions
  actions: RoutingActions
  createdAt: string
}

export type RoutingOutcome = {
  matchedRules: string[]
  addedTags: string[]
  addedGroups: string[]
  leadStatus?: string
  lifecycle?: string
}

export const CUSTOMER_STATUSES = ["Prospect", "Active", "Inactive", "Churned"] as const
export type CustomerStatus = (typeof CUSTOMER_STATUSES)[number]

export const DEAL_STAGES = [
  "New Lead",
  "Contacted",
  "Interested",
  "Booked / Proposal Sent",
  "Won",
  "Lost",
  "Nurture",
] as const

export type DealStage = (typeof DEAL_STAGES)[number]

export const CAMPAIGN_TYPES = [
  "email",
  "sequence",
  "reactivation",
  "new-lead-nurture",
  "review-request",
  "win-back",
  "referral",
] as const

export type CampaignType = (typeof CAMPAIGN_TYPES)[number]

export const CAMPAIGN_STATUSES = ["draft", "pending_approval", "scheduled", "active", "completed", "paused"] as const
export type CampaignStatus = (typeof CAMPAIGN_STATUSES)[number]

const CAMPAIGN_STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  pending_approval: "Pending approval",
  scheduled: "Scheduled",
  active: "Active",
  completed: "Completed",
  paused: "Paused",
}

/** Human-friendly campaign status label (avoids showing raw values like "pending_approval"). */
export function campaignStatusLabel(status: string): string {
  return CAMPAIGN_STATUS_LABELS[status] ?? status.replace(/_/g, " ")
}

export const ACTIVITY_TYPES = [
  "form_submitted",
  "email_opened",
  "email_sent",
  "email_received",
  "link_clicked",
  "sms_sent",
  "call_made",
  "appointment_booked",
  "purchase_made",
  "note_added",
  "campaign_entered",
  "campaign_completed",
  "tag_added",
  "group_changed",
  "created",
  "edited",
  "connected",
] as const

export type ActivityType = (typeof ACTIVITY_TYPES)[number]

export type Contact = {
  id: string
  firstName: string
  lastName: string
  fullName: string
  companyName: string
  companyId: string
  locationId: string
  locationName: string
  ownerId: string
  ownerName: string
  email: string
  phone: string
  websiteUrl: string
  address: string
  city: string
  state: string
  zip: string
  source: string
  lifecycleStage: LifecycleStage
  leadStatus: LeadStatus
  customerStatus: CustomerStatus
  notes: string
  lastContactedAt: string | null
  lastActivityAt: string | null
  lastPurchaseAt: string | null
  totalRevenueCents: number
  productsPurchased: string
  communicationPreference: string
  optInStatus: string
  leadScore: number
  aiSummary: string
  recommendedNextAction: string
  // Nula Intelligence (enrichment)
  industry: string
  title: string
  seniority: string
  linkedinUrl: string
  fitScore: number
  enrichedAt: string | null
  enrichmentStatus: string
  tags: Tag[]
  groups: Group[]
  createdAt: string
}

export type Company = {
  id: string
  name: string
  website: string
  phone: string
  address: string
  city: string
  state: string
  zip: string
  notes: string
  contactCount: number
  // Nula Intelligence (enrichment)
  industry: string
  subIndustry: string
  employeeCount: number
  revenueEstimate: string
  companySize: string
  companyType: string
  linkedinUrl: string
  description: string
  techStack: string
  fitScore: number
  enrichedAt: string | null
  enrichmentStatus: string
  createdAt: string
}

export type Location = {
  id: string
  companyId: string
  name: string
  address: string
  city: string
  state: string
  zip: string
  phone: string
  contactCount: number
  createdAt: string
}

export type Tag = {
  id: string
  name: string
  slug: string
  color: string
  description: string
}

export type Group = {
  id: string
  name: string
  slug: string
  description: string
  type: string
  isSystem: boolean
  memberCount?: number
}

export type Deal = {
  id: string
  contactId: string
  contactName: string
  title: string
  offerInterest: string
  stage: DealStage
  estimatedValueCents: number
  probability: number
  nextStep: string
  ownerId: string
  closeDate: string | null
}

export const TASK_STATUSES = ["open", "done"] as const
export type TaskStatus = (typeof TASK_STATUSES)[number]

export const TASK_PRIORITIES = ["low", "normal", "high"] as const
export type TaskPriority = (typeof TASK_PRIORITIES)[number]

export type Task = {
  id: string
  title: string
  notes: string
  status: TaskStatus
  priority: TaskPriority
  dueAt: string | null
  contactId: string
  contactName: string
  assigneeId: string
  assigneeName: string
  completedAt: string | null
  createdAt: string
}

export type Booking = {
  id: string
  contactId: string
  contactName: string
  title: string
  status: string
  startAt: string | null
  endAt: string | null
  location: string
  notes: string
  attendeeName: string
  attendeeEmail: string
  attendeePhone: string
  source: string
  createdAt: string
}

export type CampaignStep = {
  step: number
  channel: "email" | "sms" | string
  subject?: string
  /** Rich-text HTML body (produced by the email editor). */
  body?: string
  /** Optional featured image shown above the body in the rendered email. */
  featuredImageUrl?: string
  delayDays?: number
}

/** A one-time email ("broadcast") vs a multi-step drip ("sequence"). */
export type CampaignKind = "broadcast" | "sequence"

export type Campaign = {
  id: string
  name: string
  kind: CampaignKind
  type: CampaignType
  status: CampaignStatus
  goal: string
  audience: string
  groupId: string | null
  sequence: CampaignStep[]
  createdAt: string
}

export type Activity = {
  id: string
  type: ActivityType | string
  message: string
  contactId: string
  contactName: string
  companyId: string
  companyName: string
  actorName: string
  /** Underlying record this activity points to (e.g. "message" + a message id). */
  refType: string
  refId: string
  at: string
}

export type AiActionPreview = {
  title: string
  description: string
  impactCount: number
  criteria: string[]
  warnings: string[]
  requiresApproval: boolean
  sampleContactIds?: string[]
}

export type AiAction = {
  id: string
  command: string
  intent: string
  status: "pending" | "approved" | "executed" | "cancelled" | "undone"
  preview: AiActionPreview
  summary: string
  reversible: boolean
  createdAt: string
  executedAt: string | null
}

export type DashboardStats = {
  newLeads: number
  needsFollowUp: number
  hotLeads: number
  recentCustomers: number
  inactiveCustomers: number
  totalContacts: number
  tagCount: number
  groupCount: number
}

export type ReportData = {
  totalContacts: number
  customers: number
  conversionRate: number
  totalCampaigns: number
  leadsBySource: { source: string; count: number }[]
  lifecycleFunnel: { stage: LifecycleStage; count: number }[]
  campaignsByStatus: { status: CampaignStatus | string; count: number }[]
}

export type Message = {
  id: string
  contactId: string
  direction: "inbound" | "outbound" | string
  channel: string
  subject: string
  body: string
  status: string
  createdAt: string
}

export type InboxConversation = {
  contactId: string
  contactName: string
  contactEmail: string
  lastMessage: string
  lastDirection: string
  lastChannel: string
  lastAt: string
  messageCount: number
  unread: boolean
}

export type SessionUser = {
  id: string
  name: string
  email: string
  role: import("@/lib/roles").WorkspaceRole
  image: string | null
}

export function contactFullName(first: string, last: string) {
  return [first, last].filter(Boolean).join(" ").trim() || "Unnamed contact"
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")
}

export function leadScoreLabel(score: number): "Hot" | "Warm" | "Nurture" | "Low" {
  if (score >= 80) return "Hot"
  if (score >= 50) return "Warm"
  if (score >= 20) return "Nurture"
  return "Low"
}

export function formatRevenue(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100)
}
