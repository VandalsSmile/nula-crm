import "server-only"

import { and, eq, or, sql } from "drizzle-orm"
import { z } from "zod"

import { db } from "@/lib/db"
import {
  activities,
  contactGroups,
  contactTags,
  contacts,
  groups,
  tags,
} from "@/lib/db/schema"
import { workspaceUserIdMatches } from "@/lib/workspace-scope"
import { sharedWorkspaceId } from "@/lib/workspace-scope"
import { slugifyTag } from "@/lib/crm-defaults"
import { randomId } from "@/lib/library-helpers"
import { mapContact } from "@/lib/mappers"
import { calculateLeadScore, recommendedNextActionForLead } from "@/lib/leads/scoring"
import { generateLeadSummary } from "@/lib/leads/summary"
import { processLeadAutomations } from "@/lib/automations/engine"
import { getWorkspaceScopeIds } from "@/lib/workspace-scope"
import {
  dedupeHash,
  ensureLeadSource,
  markLeadEvent,
  recordLeadEvent,
  type SourceContext,
} from "@/lib/leads/sources"

export const leadIntakeSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  source: z.string().optional(),
  message: z.string().optional(),
  notes: z.string().optional(),
  interest: z.string().optional(),
  keywords: z.array(z.string()).optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
  workspaceId: z.string().optional(),
})

export type LeadIntakePayload = z.infer<typeof leadIntakeSchema>

export type LeadIntakeResult = {
  contactId: string
  isNew: boolean
  isDuplicate: boolean
  leadScore: number
  aiSummary: string
  recommendedNextAction: string
}

function normalizeEmail(email?: string) {
  return email?.trim().toLowerCase() ?? ""
}

function normalizePhone(phone?: string) {
  return phone?.replace(/\D/g, "") ?? ""
}

export function resolveWebhookWorkspaceId(payloadWorkspaceId?: string): string {
  const shared = sharedWorkspaceId()
  if (shared) return shared
  if (payloadWorkspaceId?.trim()) return payloadWorkspaceId.trim()
  throw new Error("workspaceId is required when NULA_SHARED_WORKSPACE_ID is not set")
}

async function findDuplicateContact(
  workspaceId: string,
  scopeIds: string[],
  email: string,
  phone: string,
) {
  const conditions = []
  if (email) conditions.push(sql`lower(${contacts.email}) = ${email}`)
  if (phone.length >= 7) {
    conditions.push(sql`regexp_replace(${contacts.phone}, '[^0-9]', '', 'g') = ${phone}`)
  }
  if (conditions.length === 0) return null

  const [row] = await db
    .select()
    .from(contacts)
    .where(and(workspaceUserIdMatches(contacts.userId, scopeIds), or(...conditions)))
    .limit(1)

  return row ?? null
}

async function ensureTag(workspaceId: string, scopeIds: string[], slug: string, name: string) {
  const [existing] = await db
    .select()
    .from(tags)
    .where(and(workspaceUserIdMatches(tags.userId, scopeIds), eq(tags.slug, slug)))
    .limit(1)
  if (existing) return existing

  const [created] = await db
    .insert(tags)
    .values({
      id: randomId("t"),
      userId: workspaceId,
      name,
      slug,
      description: "Auto-applied on lead intake",
    })
    .returning()
  return created
}

async function ensureGroup(workspaceId: string, scopeIds: string[], name: string) {
  const slug = slugifyTag(name)
  const [existing] = await db
    .select()
    .from(groups)
    .where(and(workspaceUserIdMatches(groups.userId, scopeIds), eq(groups.slug, slug)))
    .limit(1)
  if (existing) return existing

  const [created] = await db
    .insert(groups)
    .values({
      id: randomId("g"),
      userId: workspaceId,
      name,
      slug,
      description: "Auto-applied on lead intake",
      type: "audience",
    })
    .returning()
  return created
}

function sourceTagSlug(source?: string) {
  const normalized = (source ?? "website").toLowerCase().replace(/[^a-z0-9]+/g, "-")
  return `source-${normalized.replace(/^source-/, "")}`
}

export async function processLeadIntake(
  raw: unknown,
  options?: { source?: SourceContext },
): Promise<LeadIntakeResult> {
  const payload = leadIntakeSchema.parse(raw)
  const workspaceId = resolveWebhookWorkspaceId(payload.workspaceId)
  const scopeIds = await getWorkspaceScopeIds(workspaceId)

  const email = normalizeEmail(payload.email)
  const phone = normalizePhone(payload.phone)

  // Lead Integration module: resolve the source and record a raw audit event.
  const leadSource = options?.source ? await ensureLeadSource(workspaceId, options.source) : null
  const eventId = leadSource
    ? await recordLeadEvent({
        workspaceId,
        sourceId: leadSource.id,
        channel: leadSource.channel,
        dedupeHash: dedupeHash(email, phone),
        payload: payload as Record<string, unknown>,
      })
    : null

  try {
    const firstName = payload.firstName.trim()
  const lastName = payload.lastName?.trim() ?? ""
  const source = payload.source?.trim() || "website-form"

  const leadScore = calculateLeadScore({
    source,
    email,
    phone,
    message: payload.message,
    notes: payload.notes,
    interest: payload.interest,
    keywords: payload.keywords,
  })

  const aiSummary = await generateLeadSummary({
    firstName,
    lastName,
    source,
    message: payload.message,
    notes: payload.notes,
    interest: payload.interest,
    leadScore,
  })

  const recommendedNextAction = recommendedNextActionForLead(leadScore, source)

  const duplicate = await findDuplicateContact(workspaceId, scopeIds, email, phone)
  let contactId: string
  let isNew = false
  const isDuplicate = Boolean(duplicate)

  if (duplicate) {
    contactId = duplicate.id
    await db
      .update(contacts)
      .set({
        firstName: firstName || duplicate.firstName,
        lastName: lastName || duplicate.lastName,
        name: [firstName || duplicate.firstName, lastName || duplicate.lastName].filter(Boolean).join(" "),
        email: email || duplicate.email,
        phone: payload.phone?.trim() || duplicate.phone,
        source: source || duplicate.source,
        notes: [duplicate.notes, payload.notes, payload.message].filter(Boolean).join("\n\n"),
        leadScore: Math.max(duplicate.leadScore, leadScore),
        aiSummary,
        recommendedNextAction,
        lastActivityAt: new Date(),
        lifecycleStage: duplicate.lifecycleStage === "Lost / Unqualified" ? "New Lead" : duplicate.lifecycleStage,
      })
      .where(eq(contacts.id, duplicate.id))
  } else {
    isNew = true
    const [row] = await db
      .insert(contacts)
      .values({
        id: randomId("ct"),
        userId: workspaceId,
        firstName,
        lastName,
        name: [firstName, lastName].filter(Boolean).join(" "),
        email,
        phone: payload.phone?.trim() ?? "",
        address: payload.address ?? "",
        city: payload.city ?? "",
        state: payload.state ?? "",
        zip: payload.zip ?? "",
        source,
        lifecycleStage: "New Lead",
        leadStatus: "Open",
        notes: [payload.notes, payload.message].filter(Boolean).join("\n\n"),
        leadScore,
        aiSummary,
        recommendedNextAction,
        lastActivityAt: new Date(),
      })
      .returning()
    contactId = row.id
  }

  const sourceTag = await ensureTag(workspaceId, scopeIds, sourceTagSlug(source), sourceTagSlug(source))
  await db
    .insert(contactTags)
    .values({ contactId, tagId: sourceTag.id, addedBy: "lead-intake" })
    .onConflictDoNothing()

  if (leadScore >= 50 && payload.interest) {
    const interestSlug = slugifyTag(`interest-${payload.interest}`)
    const interestTag = await ensureTag(workspaceId, scopeIds, interestSlug, interestSlug)
    await db
      .insert(contactTags)
      .values({ contactId, tagId: interestTag.id, addedBy: "lead-intake" })
      .onConflictDoNothing()
  }

  const newLeadsGroup = await ensureGroup(workspaceId, scopeIds, "New Leads")
  await db
    .insert(contactGroups)
    .values({ contactId, groupId: newLeadsGroup.id, addedBy: "lead-intake" })
    .onConflictDoNothing()

  await db.insert(activities).values({
    id: randomId("a"),
    userId: workspaceId,
    type: "form_submitted",
    message: isDuplicate
      ? `Lead updated from ${source} (${isNew ? "created" : "matched existing contact"})`
      : `New lead from ${source}`,
    contactId,
    actorId: "lead-intake",
  })

  await processLeadAutomations(workspaceId, contactId, { isNew, leadScore, source })

    const result = {
      contactId,
      isNew,
      isDuplicate,
      leadScore,
      aiSummary,
      recommendedNextAction,
    }
    if (eventId) await markLeadEvent(eventId, { status: "processed", contactId })
    return result
  } catch (err) {
    if (eventId) {
      await markLeadEvent(eventId, {
        status: "failed",
        error: err instanceof Error ? err.message : "intake failed",
      })
    }
    throw err
  }
}

export async function processLeadIntakeForContact(contact: ReturnType<typeof mapContact>) {
  return {
    contactId: contact.id,
    isNew: true,
    isDuplicate: false,
    leadScore: contact.leadScore,
    aiSummary: contact.aiSummary,
    recommendedNextAction: contact.recommendedNextAction,
  }
}
