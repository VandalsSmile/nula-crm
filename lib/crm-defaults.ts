import type { CampaignType } from "@/lib/crm-types"

export const BUSINESS_TYPES = [
  { id: "general", label: "General / other" },
  { id: "iv-therapy", label: "IV therapy / wellness spa" },
  { id: "med-spa", label: "Med spa" },
  { id: "fitness", label: "Fitness studio" },
  { id: "home-services", label: "Home services" },
  { id: "retail", label: "Local retail" },
  { id: "professional", label: "Professional services" },
  { id: "b2b", label: "B2B services" },
  { id: "hospitality", label: "Restaurant / hospitality" },
] as const

export type BusinessTypeId = (typeof BUSINESS_TYPES)[number]["id"]

/** Industry-neutral fallback used when no business type is chosen. */
export const DEFAULT_BUSINESS_TYPE: BusinessTypeId = "general"

export const DEFAULT_GROUPS: Record<BusinessTypeId, string[]> = {
  general: ["New Leads", "Active Customers", "Past Customers", "Reactivation List", "Do Not Market"],
  "iv-therapy": [
    "New Leads",
    "Active Customers",
    "Members",
    "Past Customers",
    "Inactive 60 Days",
    "Inactive 90 Days",
    "NAD Buyers",
    "Weight Loss Buyers",
    "Beauty Buyers",
    "Immunity Buyers",
    "Travel Recovery Buyers",
    "Referral Partners",
    "Reactivation List",
    "Do Not Market",
  ],
  "med-spa": ["New Leads", "Active Customers", "Past Customers", "Reactivation List", "Do Not Market"],
  fitness: ["New Leads", "Active Members", "Past Members", "Trial Leads", "Reactivation List"],
  "home-services": ["New Leads", "Active Customers", "Past Customers", "Reactivation List"],
  retail: ["New Leads", "Customers", "VIP", "Inactive 90 Days"],
  professional: ["New Leads", "Active Clients", "Past Clients", "Nurture"],
  b2b: ["New Leads", "Active Accounts", "Past Accounts", "Nurture"],
  hospitality: ["New Leads", "Guests", "Members", "Inactive Guests"],
}

export const DEFAULT_TAGS: Record<BusinessTypeId, string[]> = {
  general: [
    "source-website",
    "source-referral",
    "source-google-ads",
    "needs-follow-up",
    "high-value",
    "inactive-90",
  ],
  "iv-therapy": [
    "source-google-ads",
    "source-facebook",
    "source-website",
    "source-referral",
    "interest-weight-loss",
    "interest-nad",
    "interest-beauty",
    "interest-immunity",
    "interest-recovery",
    "bought-nad",
    "bought-skinny-drip",
    "bought-myers",
    "bought-glow",
    "member",
    "inactive-60",
    "inactive-90",
    "high-value",
    "needs-follow-up",
  ],
  "med-spa": ["source-website", "interest-beauty", "needs-follow-up", "inactive-90"],
  fitness: ["source-website", "trial", "member", "inactive-60"],
  "home-services": ["source-google-ads", "needs-follow-up", "estimate-sent"],
  retail: ["vip", "inactive-90", "needs-follow-up"],
  professional: ["needs-follow-up", "proposal-sent"],
  b2b: ["needs-follow-up", "proposal-sent"],
  hospitality: ["vip", "needs-follow-up"],
}

export const CAMPAIGN_TEMPLATES: {
  id: string
  name: string
  type: CampaignType
  goal: string
  description: string
}[] = [
  {
    id: "new-lead-follow-up",
    name: "New Lead Follow-Up",
    type: "new-lead-nurture",
    goal: "Convert lead to appointment or purchase",
    description: "For new inquiries — fast response and education sequence.",
  },
  {
    id: "missed-lead-recovery",
    name: "Missed Lead Recovery",
    type: "sequence",
    goal: "Recover leads who never responded",
    description: "Re-engage silent leads with short reminders.",
  },
  {
    id: "reactivation",
    name: "Reactivation Campaign",
    type: "reactivation",
    goal: "Bring inactive customers back",
    description: "For customers with no purchase in 90+ days.",
  },
  {
    id: "one-time-buyer",
    name: "One-Time Buyer Campaign",
    type: "win-back",
    goal: "Turn one-time buyers into repeat customers",
    description: "Follow up after a single purchase.",
  },
  {
    id: "review-request",
    name: "Review Request",
    type: "review-request",
    goal: "Collect reviews from happy customers",
    description: "Send 24 hours after a positive purchase.",
  },
  {
    id: "referral",
    name: "Referral Campaign",
    type: "referral",
    goal: "Generate referrals from loyal customers",
    description: "Target high-value, engaged customers.",
  },
  {
    id: "event-lead-nurture",
    name: "Event Lead Nurture",
    type: "new-lead-nurture",
    goal: "Convert event leads",
    description: "For trade shows, pop-ups, and giveaways.",
  },
  {
    id: "service-interest",
    name: "Product/Service Interest",
    type: "email",
    goal: "Nurture interest in a specific service",
    description: "For contacts tagged with service interest.",
  },
]

export function slugifyTag(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
}
