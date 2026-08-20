import type { NormalizedEnrichment, Seniority } from "@/lib/enrichment/types"

/** Bucket an employee count into a human-friendly company-size label. */
export function companySizeBucket(employeeCount?: number): string {
  const n = employeeCount ?? 0
  if (n <= 0) return ""
  if (n === 1) return "Solo (1)"
  if (n < 10) return "Micro (2–9)"
  if (n < 50) return "SMB – Small (10–49)"
  if (n < 200) return "SMB – Established (50–199)"
  if (n < 1000) return "Mid-Market (200–999)"
  return "Enterprise (1000+)"
}

const SENIORITY_KEYWORDS: [Seniority, string[]][] = [
  ["owner", ["owner", "founder", "co-founder", "proprietor", "principal"]],
  ["c-level", ["ceo", "cfo", "coo", "cmo", "cto", "chief", "president"]],
  ["vp", ["vp", "vice president", "svp", "evp", "head of"]],
  ["director", ["director", "dir."]],
  ["manager", ["manager", "lead", "supervisor"]],
]

/** Infer a normalized seniority level from a free-text job title. */
export function seniorityFromTitle(title?: string): Seniority | undefined {
  const t = (title ?? "").toLowerCase()
  if (!t) return undefined
  for (const [level, keywords] of SENIORITY_KEYWORDS) {
    if (keywords.some((kw) => t.includes(kw))) return level
  }
  return "ic"
}

/** A director-or-above is treated as a decision maker (configurable later). */
export function isDecisionMaker(seniority?: Seniority): boolean {
  if (!seniority) return false
  return ["director", "vp", "c-level", "owner"].includes(seniority)
}

const SENIORITY_LABELS: Record<Seniority, string> = {
  ic: "Individual contributor",
  manager: "Manager",
  director: "Director",
  vp: "VP",
  "c-level": "C-level",
  owner: "Owner / Founder",
}

export function seniorityLabel(seniority?: Seniority): string {
  return seniority ? SENIORITY_LABELS[seniority] : ""
}

function titleCase(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0]!.toUpperCase() + w.slice(1))
    .join(" ")
}

/**
 * Fill in derived fields (size bucket, seniority, decision-maker, market) so the
 * rest of the app can rely on a complete normalized record.
 */
export function completeNormalized(input: NormalizedEnrichment): NormalizedEnrichment {
  const seniority = input.seniority ?? seniorityFromTitle(input.title)
  const market =
    input.market ||
    [input.city, input.state].filter(Boolean).join(", ") ||
    ""
  return {
    ...input,
    seniority,
    decisionMaker: input.decisionMaker ?? isDecisionMaker(seniority),
    companySize: input.companySize || companySizeBucket(input.employeeCount),
    market,
    enrichedAt: input.enrichedAt ?? new Date().toISOString(),
  }
}

/**
 * Translate a normalized record into readable Nula tag names. Slugs stay clean
 * and queryable (e.g. "industry-healthcare", "seniority-decision-maker") because
 * slugifyTag normalizes the names. These power AI segments.
 */
export function attributeTagNames(n: NormalizedEnrichment): string[] {
  const tags: string[] = []
  if (n.industry) tags.push(`Industry: ${titleCase(n.industry)}`)
  if (n.subIndustry) tags.push(`Sub-industry: ${titleCase(n.subIndustry)}`)
  if (n.companySize) tags.push(`Company size: ${n.companySize}`)
  if (n.companyType) tags.push(`Company type: ${titleCase(n.companyType)}`)
  if (n.decisionMaker) tags.push("Seniority: Decision maker")
  else if (n.seniority) tags.push(`Seniority: ${seniorityLabel(n.seniority)}`)
  if (n.market) tags.push(`Market: ${n.market}`)
  return tags
}
