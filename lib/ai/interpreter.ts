import type { AiActionPreview } from "@/lib/crm-types"

export type AiIntent =
  | "search_contacts"
  | "add_to_group"
  | "apply_tag"
  | "normalize_tags"
  | "find_duplicates"
  | "create_reactivation_campaign"
  | "summarize_conversion"
  | "draft_follow_up"
  | "unknown"

export type InterpretedCommand = {
  intent: AiIntent
  preview: AiActionPreview
  params: Record<string, string>
  requiresApproval: boolean
}

function basePreview(title: string, description: string, requiresApproval = true): AiActionPreview {
  return {
    title,
    description,
    impactCount: 0,
    criteria: [],
    warnings: [],
    requiresApproval,
  }
}

export function interpretCommand(command: string): InterpretedCommand {
  const text = command.trim().toLowerCase()

  if (/normalize.*tag|clean.*tag|consolidat.*tag/.test(text)) {
    return {
      intent: "normalize_tags",
      requiresApproval: true,
      params: {},
      preview: {
        ...basePreview("Normalize tags", "Review similar tags and consolidate into clean normalized tags."),
        criteria: ["Scan all tags for similar names", "Propose consolidated tag set", "Map old tags to new tags"],
        warnings: ["No contacts will be deleted"],
      },
    }
  }

  if (/duplicate/.test(text)) {
    return {
      intent: "find_duplicates",
      requiresApproval: false,
      params: {},
      preview: {
        ...basePreview("Find duplicate contacts", "Search for contacts with matching email or phone.", false),
        criteria: ["Match on email", "Match on normalized phone"],
      },
    }
  }

  if (/reactivation|haven.?t (bought|purchased)|inactive.*90|90 days/.test(text)) {
    return {
      intent: "create_reactivation_campaign",
      requiresApproval: true,
      params: { days: "90" },
      preview: {
        ...basePreview(
          "Create reactivation campaign",
          "Draft a campaign for customers who have not purchased recently.",
        ),
        criteria: ["Past customers", "No purchase in 90+ days", "Exclude opted-out contacts"],
        warnings: ["Campaign will not send until you approve"],
      },
    }
  }

  if (/summariz.*convert|why.*not convert/.test(text)) {
    return {
      intent: "summarize_conversion",
      requiresApproval: false,
      params: {},
      preview: {
        ...basePreview("Summarize conversion blockers", "Analyze leads and summarize why they are not converting.", false),
        criteria: ["Review open leads", "Check last activity", "Identify common patterns"],
      },
    }
  }

  if (/follow.?up email|write.*email/.test(text)) {
    return {
      intent: "draft_follow_up",
      requiresApproval: false,
      params: { topic: extractTopic(text) },
      preview: {
        ...basePreview("Draft follow-up email", "Generate a follow-up email draft for your review.", false),
        criteria: ["Draft only — nothing will be sent"],
      },
    }
  }

  const groupMatch = text.match(/(?:move|add).*(?:to|into)\s+(?:the\s+)?(.+?)\s+group/)
  if (groupMatch) {
    const groupName = groupMatch[1].replace(/\.$/, "").trim()
    const product = extractProductKeyword(text)
    return {
      intent: "add_to_group",
      requiresApproval: true,
      params: { groupName, product: product ?? "" },
      preview: {
        ...basePreview(`Add contacts to ${groupName}`, `Move matching contacts into the ${groupName} group.`),
        criteria: product ? [`Purchase history includes "${product}"`] : [`Matches segment: ${groupName}`],
        warnings: ["No contacts will be deleted"],
      },
    }
  }

  if (/facebook.*never booked|leads.*never booked|show.*leads/.test(text)) {
    return {
      intent: "search_contacts",
      requiresApproval: false,
      params: { filter: "never_booked" },
      preview: {
        ...basePreview("Search contacts", "Find contacts matching your criteria.", false),
        criteria: ["Filter by source and lifecycle stage"],
      },
    }
  }

  const tagMatch = text.match(/^tag\b.*?\b(bought|purchased|interested in)\s+(.+)$/)
  if (tagMatch) {
    const product = tagMatch[2].replace(/[.!?]+$/, "").trim()
    const prefix = tagMatch[1] === "interested in" ? "interested in" : "bought"
    const tagName = `${prefix} ${product}`
    return {
      intent: "apply_tag",
      requiresApproval: true,
      params: { tag: tagName, tagName, product },
      preview: {
        ...basePreview(`Apply tag: ${tagName}`, `Tag contacts who ${prefix} ${product}.`),
        criteria: [`Apply tag to contacts whose history mentions "${product}"`],
        warnings: ["No contacts will be deleted"],
      },
    }
  }

  return {
    intent: "unknown",
    requiresApproval: false,
    params: {},
    preview: {
      ...basePreview("Search CRM", `I'll search your CRM for: "${command}"`, false),
      criteria: ["Natural language search across contacts, tags, and groups"],
    },
  }
}

function extractProductKeyword(text: string): string | null {
  const bought = text.match(/\b(?:bought|purchased|buy|buys)\s+([a-z0-9+\s'&-]+)/)
  return bought?.[1]?.replace(/[.!?]+$/, "").trim() || null
}

function extractTopic(text: string): string {
  const about = text.match(/(?:for|about)\s+(.+)/)
  return about?.[1]?.trim() ?? "general follow-up"
}

export function productKeywordsForIntent(product: string): string[] {
  return [product.trim().toLowerCase()].filter(Boolean)
}
