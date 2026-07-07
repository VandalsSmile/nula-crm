import "server-only"

import { and, eq } from "drizzle-orm"

import { db } from "@/lib/db"
import { campaigns, groups } from "@/lib/db/schema"
import { workspaceUserIdMatches, getWorkspaceScopeIds } from "@/lib/workspace-scope"
import { slugifyTag } from "@/lib/crm-defaults"
import { randomId } from "@/lib/library-helpers"

type CampaignDraftInput = {
  name: string
  type: string
  goal: string
  audience: string
  groupName?: string
  groupId?: string
}

const REACTIVATION_SEQUENCE = [
  { step: 1, channel: "email", subject: "We haven't seen you in a while", body: "We miss you! Here's a special offer to welcome you back.", delayDays: 0 },
  { step: 2, channel: "sms", body: "Quick reminder — we'd love to see you again. Reply STOP to opt out.", delayDays: 3 },
  { step: 3, channel: "email", subject: "Still thinking about it?", body: "Here's what our customers love most about coming back.", delayDays: 7 },
  { step: 4, channel: "email", subject: "Last call — your offer expires soon", body: "Don't miss this limited-time welcome-back offer.", delayDays: 14 },
]

const NEW_LEAD_SEQUENCE = [
  { step: 1, channel: "email", subject: "Thanks for reaching out!", body: "We're excited to help. Here's what to expect next.", delayDays: 0 },
  { step: 2, channel: "sms", body: "Hi! Just checking in — any questions we can answer?", delayDays: 1 },
  { step: 3, channel: "email", subject: "Ready to book?", body: "Pick a time that works for you.", delayDays: 3 },
]

function sequenceForType(type: string) {
  if (type === "reactivation" || type === "win-back") return REACTIVATION_SEQUENCE
  if (type === "new-lead-nurture") return NEW_LEAD_SEQUENCE
  if (type === "review-request") {
    return [{ step: 1, channel: "email", subject: "How did we do?", body: "We'd love your feedback — it helps us serve you better.", delayDays: 1 }]
  }
  return REACTIVATION_SEQUENCE
}

export async function createCampaignDraftForWorkspace(workspaceId: string, input: CampaignDraftInput) {
  const scopeIds = await getWorkspaceScopeIds(workspaceId)
  let groupId = input.groupId ?? null

  if (!groupId && input.groupName) {
    const slug = slugifyTag(input.groupName)
    let [group] = await db
      .select()
      .from(groups)
      .where(and(workspaceUserIdMatches(groups.userId, scopeIds), eq(groups.slug, slug)))
      .limit(1)
    if (!group) {
      ;[group] = await db
        .insert(groups)
        .values({
          id: randomId("g"),
          userId: workspaceId,
          name: input.groupName,
          slug,
          description: `Audience for ${input.name}`,
          type: "audience",
        })
        .returning()
    }
    groupId = group?.id ?? null
  }

  const [row] = await db
    .insert(campaigns)
    .values({
      id: randomId("cmp"),
      userId: workspaceId,
      name: input.name,
      type: input.type,
      goal: input.goal,
      audience: input.audience,
      groupId,
      status: "draft",
      sequence: sequenceForType(input.type),
    })
    .returning()

  return row
}
