/**
 * Nula Intelligence — supplier-agnostic enrichment shapes.
 *
 * The supplier (Clay in Stage 1) is normalized into this single canonical shape
 * so the rest of Nula never depends on any provider's field names.
 */

export type EnrichmentSubjectType = "contact" | "company"

/** Normalized seniority ladder derived from a job title. */
export const SENIORITY_LEVELS = ["ic", "manager", "director", "vp", "c-level", "owner"] as const
export type Seniority = (typeof SENIORITY_LEVELS)[number]

/** The 10–15 high-value fields Nula cares about, normalized. */
export type NormalizedEnrichment = {
  // Identity
  domain?: string
  companyName?: string
  // Firmographics
  industry?: string
  subIndustry?: string
  employeeCount?: number
  revenueEstimate?: string
  companySize?: string
  companyType?: string
  description?: string
  techStack?: string[]
  growthSignals?: string[]
  // Location / territory
  city?: string
  state?: string
  market?: string
  // Person
  title?: string
  seniority?: Seniority
  decisionMaker?: boolean
  workEmail?: string
  phone?: string
  companyLinkedin?: string
  personLinkedin?: string
  // Meta
  enrichedAt?: string
}

/** Feedback signals captured on an enriched record. */
export const FEEDBACK_SIGNALS = [
  "good_prospect",
  "bad_prospect",
  "contact_correct",
  "contact_incorrect",
  "became_opportunity",
  "became_customer",
] as const
export type FeedbackSignal = (typeof FEEDBACK_SIGNALS)[number]
