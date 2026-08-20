import { chatCompletion } from "@/lib/ai/llm"
import type { NormalizedEnrichment } from "@/lib/enrichment/types"
import { fitScoreLabel } from "@/lib/enrichment/fit-score"

export type EnrichmentSummary = {
  summary: string
  recommendation: string
}

function templateSummary(
  name: string,
  n: NormalizedEnrichment,
  fitScore: number,
): EnrichmentSummary {
  const label = fitScoreLabel(fitScore)
  const bits: string[] = []
  if (n.industry) bits.push(n.subIndustry ? `${n.industry} (${n.subIndustry})` : n.industry)
  if (n.companySize) bits.push(n.companySize.toLowerCase())
  if (n.revenueEstimate) bits.push(`est. ${n.revenueEstimate} revenue`)
  const profile = bits.length ? bits.join(", ") : "a business we now have firmographics for"
  const role = n.title ? `${name} (${n.title})` : name

  const summary = `${role} is at ${
    n.companyName || "this company"
  } — ${profile}.${n.decisionMaker ? " Appears to be a decision maker." : ""}`.trim()

  const recommendation =
    label === "Strong"
      ? "High-priority prospect. Review their website and current marketing before reaching out."
      : label === "Good"
        ? "Solid fit. Add to your outreach list and personalize the first touch."
        : label === "Fair"
          ? "Worth a light-touch nurture — qualify further before investing time."
          : "Low fit on current data. Deprioritize unless something changes."

  return { summary, recommendation }
}

/**
 * Generate a plain-English "what we know / why it matters" summary + recommended
 * next step from the normalized enrichment. Reuses the shared LLM layer; falls
 * back to a deterministic template when no AI provider is configured.
 */
export async function generateEnrichmentSummary(
  name: string,
  n: NormalizedEnrichment,
  fitScore: number,
): Promise<EnrichmentSummary> {
  const llm = await chatCompletion(
    [
      {
        role: "system",
        content:
          "You are Nula, a CRM for small business owners. Given enrichment data about a business contact, write a 2–3 sentence plain-English summary (what we know / why it matters) and one concrete recommended next step. No jargon. Return JSON: { \"summary\": string, \"recommendation\": string }.",
      },
      {
        role: "user",
        content: JSON.stringify({ name, fitScore, fitLabel: fitScoreLabel(fitScore), ...n }),
      },
    ],
    { json: true },
  )

  if (llm) {
    try {
      const parsed = JSON.parse(llm) as Partial<EnrichmentSummary>
      if (parsed.summary && parsed.recommendation) {
        return { summary: parsed.summary.trim(), recommendation: parsed.recommendation.trim() }
      }
    } catch {
      // fall through to template
    }
  }
  return templateSummary(name, n, fitScore)
}
