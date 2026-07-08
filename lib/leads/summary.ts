import { leadScoreLabel } from "@/lib/crm-types"
import { chatCompletion } from "@/lib/ai/llm"
import type { LeadScoringInput } from "@/lib/leads/scoring"

export type LeadSummaryInput = LeadScoringInput & {
  firstName: string
  lastName?: string
  leadScore: number
}

function templateLeadSummary(input: LeadSummaryInput): string {
  const name = [input.firstName, input.lastName].filter(Boolean).join(" ").trim() || "This lead"
  const source = input.source || "an unknown source"
  const intent = input.interest || input.message || "general inquiry"
  const label = leadScoreLabel(input.leadScore)

  return `${name} came from ${source} regarding ${intent}. This is a ${label.toLowerCase()}-intent lead (score ${input.leadScore}). Recommended next step: ${
    input.leadScore >= 80
      ? "call within 15 minutes and send your intro offer follow-up."
      : input.leadScore >= 50
        ? "send a personalized follow-up and book a call within 24 hours."
        : "enroll in the new lead nurture sequence."
  }`
}

export async function generateLeadSummary(input: LeadSummaryInput): Promise<string> {
  const llm = await chatCompletion([
    {
      role: "system",
      content:
        "You write concise CRM lead summaries for small business owners. One short paragraph, plain language, actionable next step.",
    },
    {
      role: "user",
      content: JSON.stringify({
        name: [input.firstName, input.lastName].filter(Boolean).join(" "),
        source: input.source,
        interest: input.interest,
        message: input.message,
        leadScore: input.leadScore,
        scoreLabel: leadScoreLabel(input.leadScore),
      }),
    },
  ])

  return llm?.trim() || templateLeadSummary(input)
}
