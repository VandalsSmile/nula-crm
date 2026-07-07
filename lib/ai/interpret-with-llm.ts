import type { AiActionPreview } from "@/lib/crm-types"
import { chatCompletion } from "@/lib/ai/llm"
import {
  interpretCommand,
  type AiIntent,
  type InterpretedCommand,
} from "@/lib/ai/interpreter"

const VALID_INTENTS: AiIntent[] = [
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

  return {
    intent: raw.intent,
    params: raw.params ?? {},
    requiresApproval: raw.requiresApproval ?? preview.requiresApproval,
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
  "intent": "search_contacts" | "add_to_group" | "apply_tag" | "normalize_tags" | "find_duplicates" | "create_reactivation_campaign" | "summarize_conversion" | "draft_follow_up" | "unknown",
  "params": { "groupName"?: string, "tagName"?: string, "product"?: string, "days"?: string, "topic"?: string, "filter"?: string },
  "requiresApproval": boolean,
  "preview": {
    "title": string,
    "description": string,
    "criteria": string[],
    "warnings": string[]
  }
}

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
