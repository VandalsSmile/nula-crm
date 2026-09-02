import type { AiActionPreview } from "@/lib/crm-types"
import { chatCompletion } from "@/lib/ai/llm"
import {
  interpretCommand,
  type AiIntent,
  type InterpretedCommand,
} from "@/lib/ai/interpreter"

const VALID_INTENTS: AiIntent[] = [
  "search_crm",
  "search_contacts",
  "add_to_group",
  "apply_tag",
  "normalize_tags",
  "find_duplicates",
  "create_reactivation_campaign",
  "summarize_conversion",
  "draft_follow_up",
  "unknown",
]

type LlmInterpretation = {
  intent?: string
  params?: Record<string, string>
  requiresApproval?: boolean
  preview?: {
    title?: string
    description?: string
    criteria?: string[]
    warnings?: string[]
  }
}

function isValidIntent(intent: string): intent is AiIntent {
  return VALID_INTENTS.includes(intent as AiIntent)
}

function normalizeLlmResult(raw: LlmInterpretation, command: string): InterpretedCommand | null {
  if (!raw.intent || !isValidIntent(raw.intent)) return null

  const preview: AiActionPreview = {
    title: raw.preview?.title ?? "Proposed action",
    description: raw.preview?.description ?? command,
    impactCount: 0,
    criteria: raw.preview?.criteria ?? [],
    warnings: raw.preview?.warnings ?? [],
    requiresApproval: raw.requiresApproval ?? true,
  }

  const params = raw.params ?? {}
  // Search always needs the text to look up; fall back to the raw command.
  if (raw.intent === "search_crm" && !params.query?.trim()) {
    params.query = command.trim()
  }

  return {
    intent: raw.intent,
    params,
    requiresApproval: raw.intent === "search_crm" ? false : raw.requiresApproval ?? preview.requiresApproval,
    preview,
  }
}

export async function interpretCommandAsync(command: string): Promise<InterpretedCommand> {
  const content = await chatCompletion(
    [
      {
        role: "system",
        content: `You interpret natural-language CRM commands for a small business CRM.
Return JSON only with this shape:
{
  "intent": "search_crm" | "search_contacts" | "add_to_group" | "apply_tag" | "normalize_tags" | "find_duplicates" | "create_reactivation_campaign" | "summarize_conversion" | "draft_follow_up" | "unknown",
  "params": { "query"?: string, "groupName"?: string, "tagName"?: string, "product"?: string, "days"?: string, "topic"?: string, "filter"?: string },
  "requiresApproval": boolean,
  "preview": {
    "title": string,
    "description": string,
    "criteria": string[],
    "warnings": string[]
  }
}

Intent guidance:
- Use "search_crm" when the user is looking something up or asking to find/show a specific record — a person, company, deal, group, or tag (e.g. "find John", "acme corp", "who is jane@x.com", "show the widget deal"). Put the search text in params.query. Never requires approval.
- Use the action intents (add_to_group, apply_tag, normalize_tags, create_reactivation_campaign, etc.) only for changes.

Safety rules:
- Bulk edits, deletes, sends, opt-in changes, lifecycle moves, campaigns, merges, exports require approval (requiresApproval: true).
- Search, summarize, draft-only, suggest tags/segments do not require approval.

Tags describe facts. Groups describe audiences.`,
      },
      { role: "user", content: command },
    ],
    { json: true },
  )

  if (content) {
    try {
      const parsed = JSON.parse(content) as LlmInterpretation
      const normalized = normalizeLlmResult(parsed, command)
      if (normalized) return normalized
    } catch {
      // fall through to regex
    }
  }

  return interpretCommand(command)
}
