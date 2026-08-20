import type { NormalizedEnrichment } from "@/lib/enrichment/types"

export type EnrichmentSubjectInput = {
  firstName?: string
  lastName?: string
  companyName?: string
  email?: string
  phone?: string
  website?: string
  city?: string
  state?: string
}

const INDUSTRIES: {
  match: RegExp
  industry: string
  subIndustry: string
  tech: string[]
}[] = [
  { match: /ortho|health|clinic|med|dental|care|therapy|wellness/, industry: "Healthcare", subIndustry: "Orthopedics", tech: ["Epic", "Google Ads", "Meta Ads"] },
  { match: /law|legal|attorney|counsel/, industry: "Legal Services", subIndustry: "Litigation", tech: ["Clio", "LawPay"] },
  { match: /build|construct|contractor|roof|hvac|plumb/, industry: "Construction", subIndustry: "General Contracting", tech: ["Procore", "QuickBooks"] },
  { match: /shop|store|retail|boutique|goods/, industry: "Retail", subIndustry: "Specialty Retail", tech: ["Shopify", "Klaviyo"] },
  { match: /tech|soft|app|data|cloud|labs|ai|io\b/, industry: "Software", subIndustry: "B2B SaaS", tech: ["AWS", "HubSpot", "Segment"] },
  { match: /real|realty|estate|property|homes/, industry: "Real Estate", subIndustry: "Commercial", tech: ["Salesforce", "DocuSign"] },
]

/** Simple deterministic hash so mock output is stable per input. */
function hash(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return h
}

function domainFrom(input: EnrichmentSubjectInput): string {
  if (input.website) return input.website.replace(/^https?:\/\//i, "").replace(/\/.*$/, "")
  const at = input.email?.split("@")[1]
  return at ?? ""
}

const TITLES = ["Marketing Director", "Operations Manager", "VP of Sales", "Owner", "Office Manager", "Chief Marketing Officer"]
const REVENUE = ["$1M–$5M", "$5M–$10M", "$10M–$25M", "$3M–$6M"]
const TYPES = ["local", "multi-location", "regional"]

/**
 * Deterministic mock enrichment for local/dev demos when Clay isn't configured.
 * Produces plausible B2B firmographics so the full Enrich → Understand →
 * Recommend flow is demonstrable end-to-end without a live supplier.
 */
export function mockEnrichment(input: EnrichmentSubjectInput): NormalizedEnrichment {
  const domain = domainFrom(input)
  const seed = hash(`${domain}|${input.companyName ?? ""}|${input.firstName ?? ""}`)
  const key = `${domain} ${input.companyName ?? ""}`.toLowerCase()

  const bucket = INDUSTRIES.find((b) => b.match.test(key)) ?? INDUSTRIES[4]!
  const employeeCount = 8 + (seed % 180)
  const title = TITLES[seed % TITLES.length]!

  return {
    domain: domain || undefined,
    companyName: input.companyName || (domain ? domain.split(".")[0] : undefined),
    industry: bucket.industry,
    subIndustry: bucket.subIndustry,
    employeeCount,
    revenueEstimate: REVENUE[seed % REVENUE.length],
    companyType: TYPES[seed % TYPES.length],
    description: `${bucket.industry} business${input.city ? ` based in ${input.city}` : ""}.`,
    techStack: bucket.tech,
    growthSignals: seed % 2 === 0 ? ["Hiring", "Recently expanded"] : ["Steady headcount"],
    city: input.city,
    state: input.state,
    title,
    workEmail: input.email,
    phone: input.phone,
    companyLinkedin: domain ? `https://www.linkedin.com/company/${domain.split(".")[0]}` : undefined,
    personLinkedin:
      input.firstName || input.lastName
        ? `https://www.linkedin.com/in/${[input.firstName, input.lastName].filter(Boolean).join("-").toLowerCase()}`
        : undefined,
  }
}
