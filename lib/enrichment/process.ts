import "server-only"

import { and, eq } from "drizzle-orm"

import { db } from "@/lib/db"
import {
  activities,
  companies,
  contacts,
  contactTags,
  enrichmentRuns,
  tags,
} from "@/lib/db/schema"
import { workspaceUserIdMatches } from "@/lib/workspace-scope"
import { getWorkspaceScopeIds } from "@/lib/workspace-scope"
import { randomId } from "@/lib/library-helpers"
import { slugifyTag } from "@/lib/crm-defaults"
import { contactFullName } from "@/lib/crm-types"
import type { NormalizedEnrichment } from "@/lib/enrichment/types"
import { attributeTagNames, completeNormalized, seniorityLabel } from "@/lib/enrichment/normalize"
import { computeFitScore } from "@/lib/enrichment/fit-score"
import { generateEnrichmentSummary } from "@/lib/enrichment/summary"

type EnrichmentRunRow = typeof enrichmentRuns.$inferSelect

async function ensureTagId(
  workspaceId: string,
  scopeIds: string[],
  name: string,
): Promise<string> {
  const slug = slugifyTag(name)
  const [existing] = await db
    .select({ id: tags.id })
    .from(tags)
    .where(and(workspaceUserIdMatches(tags.userId, scopeIds), eq(tags.slug, slug)))
    .limit(1)
  if (existing) return existing.id
  const [created] = await db
    .insert(tags)
    .values({
      id: randomId("t"),
      userId: workspaceId,
      name,
      slug,
      description: "Added by Nula Intelligence",
    })
    .returning({ id: tags.id })
  return created!.id
}

async function applyAttributeTags(
  workspaceId: string,
  scopeIds: string[],
  contactId: string,
  actorId: string,
  n: NormalizedEnrichment,
): Promise<void> {
  const names = attributeTagNames(n)
  for (const name of names) {
    const tagId = await ensureTagId(workspaceId, scopeIds, name)
    await db.insert(contactTags).values({ contactId, tagId, addedBy: actorId }).onConflictDoNothing()
  }
}

/**
 * Apply an enrichment result to its subject: normalize, score, explain, persist
 * fields, apply attribute tags, close the run, and log an activity. Idempotent —
 * a run that's already completed is skipped (safe for duplicate Clay callbacks).
 */
export async function processEnrichmentResult(
  run: EnrichmentRunRow,
  raw: Record<string, unknown>,
  incoming: NormalizedEnrichment,
): Promise<void> {
  if (run.status === "completed") return

  const workspaceId = run.userId
  const scopeIds = await getWorkspaceScopeIds(workspaceId)
  const normalized = completeNormalized(incoming)
  const fitScore = computeFitScore(normalized)
  const actorId = run.requestedBy || "nula-intelligence"

  if (run.subjectType === "contact") {
    const [contact] = await db
      .select()
      .from(contacts)
      .where(and(eq(contacts.id, run.subjectId), workspaceUserIdMatches(contacts.userId, scopeIds)))
      .limit(1)
    if (!contact) {
      await db
        .update(enrichmentRuns)
        .set({ status: "failed", error: "Contact not found", completedAt: new Date() })
        .where(eq(enrichmentRuns.id, run.id))
      return
    }

    const name =
      contactFullName(contact.firstName, contact.lastName) || contact.companyName || "This contact"
    const { summary, recommendation } = await generateEnrichmentSummary(name, normalized, fitScore)

    await db
      .update(contacts)
      .set({
        industry: normalized.industry ?? contact.industry,
        websiteUrl: normalized.domain ?? contact.websiteUrl,
        title: normalized.title ?? contact.title,
        seniority: normalized.seniority ? seniorityLabel(normalized.seniority) : contact.seniority,
        linkedinUrl: normalized.personLinkedin ?? contact.linkedinUrl,
        companyName: contact.companyName || normalized.companyName || "",
        city: contact.city || normalized.city || "",
        state: contact.state || normalized.state || "",
        aiSummary: summary,
        recommendedNextAction: recommendation,
        fitScore,
        enrichedAt: new Date(),
        enrichmentStatus: "enriched",
        lastActivityAt: new Date(),
      })
      .where(eq(contacts.id, contact.id))

    await applyAttributeTags(workspaceId, scopeIds, contact.id, actorId, normalized)

    await db.insert(activities).values({
      id: randomId("a"),
      userId: workspaceId,
      type: "connected",
      message: `Enriched with Nula Intelligence — Fit ${fitScore}/100`,
      contactId: contact.id,
      actorId,
    })
  } else {
    const [company] = await db
      .select()
      .from(companies)
      .where(and(eq(companies.id, run.subjectId), workspaceUserIdMatches(companies.userId, scopeIds)))
      .limit(1)
    if (!company) {
      await db
        .update(enrichmentRuns)
        .set({ status: "failed", error: "Company not found", completedAt: new Date() })
        .where(eq(enrichmentRuns.id, run.id))
      return
    }

    await db
      .update(companies)
      .set({
        industry: normalized.industry ?? company.industry,
        subIndustry: normalized.subIndustry ?? company.subIndustry,
        employeeCount: normalized.employeeCount ?? company.employeeCount,
        revenueEstimate: normalized.revenueEstimate ?? company.revenueEstimate,
        companySize: normalized.companySize ?? company.companySize,
        companyType: normalized.companyType ?? company.companyType,
        linkedinUrl: normalized.companyLinkedin ?? company.linkedinUrl,
        description: normalized.description ?? company.description,
        techStack: normalized.techStack?.join(", ") ?? company.techStack,
        website: company.website || normalized.domain || "",
        fitScore,
        enrichedAt: new Date(),
        enrichmentStatus: "enriched",
      })
      .where(eq(companies.id, company.id))
  }

  await db
    .update(enrichmentRuns)
    .set({
      status: "completed",
      responsePayload: raw,
      normalized,
      fitScore,
      completedAt: new Date(),
    })
    .where(eq(enrichmentRuns.id, run.id))
}
