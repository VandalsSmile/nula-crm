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
  "sms",
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

export const ACTIVITY_TYPES = [
  "form_submitted",
  "email_opened",
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
  email: string
  phone: string
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
  tags: Tag[]
  groups: Group[]
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

export type Campaign = {
  id: string
  name: string
  type: CampaignType
  status: CampaignStatus
  goal: string
  audience: string
  groupId: string | null
  createdAt: string
}

export type Activity = {
  id: string
  type: ActivityType | string
  message: string
  contactId: string
  contactName: string
  actorName: string
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
  role: "Admin" | "Manager" | "Staff" | "Viewer"
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
