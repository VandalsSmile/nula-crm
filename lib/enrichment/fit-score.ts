import type { NormalizedEnrichment } from "@/lib/enrichment/types"

/**
 * Ideal-customer-profile inputs for the Fit Score. Stage 1 uses sane defaults;
 * these can later come from workspace_settings without changing the algorithm.
 */
export type FitScoreConfig = {
  /** Lowercased target industries; a match adds industry weight. */
  targetIndustries?: string[]
  /** Companies at/above this employee count are considered good scale. */
  minEmployees?: number
}

/**
 * A small, transparent, no-ML fit model in the spirit of calculateLeadScore.
 * Fit answers "is this the KIND of company we want" — distinct from lead score
 * (how hot a specific lead is right now).
 */
export function computeFitScore(
  n: NormalizedEnrichment,
  config: FitScoreConfig = {},
): number {
  let score = 20 // base: we have a real, identified company

  // Scale — enough employees to support a professional service purchase.
  const employees = n.employeeCount ?? 0
  const minEmployees = config.minEmployees ?? 10
  if (employees >= 200) score += 22
  else if (employees >= 50) score += 20
  else if (employees >= minEmployees) score += 15
  else if (employees > 0) score += 6

  // Ability to pay — revenue signal.
  if (n.revenueEstimate) {
    const rev = n.revenueEstimate.toLowerCase()
    if (/(b|billion)/.test(rev)) score += 20
    else if (/(\$?\s?(1?\d{2,})m|million)/.test(rev)) score += 16
    else if (/m/.test(rev)) score += 12
    else score += 6
  }

  // Industry fit — matches the business's ICP (if configured; otherwise a small
  // credit just for having a known industry).
  const targets = (config.targetIndustries ?? []).map((s) => s.toLowerCase())
  const industry = (n.industry ?? "").toLowerCase()
  if (industry && targets.length > 0) {
    if (targets.some((t) => industry.includes(t) || t.includes(industry))) score += 18
  } else if (industry) {
    score += 8
  }

  // Reachable buying authority.
  if (n.decisionMaker) score += 14
  else if (n.seniority === "manager") score += 6

  // Data confidence — completeness of the enriched record.
  const present = [n.industry, n.employeeCount, n.revenueEstimate, n.title, n.domain].filter(
    (v) => v !== undefined && v !== "" && v !== 0,
  ).length
  score += Math.min(10, present * 2)

  return Math.min(100, Math.max(0, Math.round(score)))
}

export type FitLabel = "Strong" | "Good" | "Fair" | "Weak"

export function fitScoreLabel(score: number): FitLabel {
  if (score >= 80) return "Strong"
  if (score >= 60) return "Good"
  if (score >= 40) return "Fair"
  return "Weak"
}
