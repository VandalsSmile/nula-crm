"use server"

import { and, desc, eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"

import { db } from "@/lib/db"
import { contactGroups, contacts, enrichmentFeedback, groups, outreachProfiles, workspaceSettings } from "@/lib/db/schema"
import { workspaceUserIdMatches } from "@/lib/auth-helpers"
import { getActingWriter } from "@/lib/entitlements"
import { requireModule } from "@/lib/modules"
import { isRespondedStatus, isWorkedStatus, TARGET_LIST_TYPE } from "@/lib/crm-types"
import { randomId } from "@/lib/library-helpers"
import { APP_ROUTES } from "@/lib/routes"
import { DEFAULT_BUSINESS_TYPE, type BusinessTypeId } from "@/lib/crm-defaults"
import { DEFAULT_FORMULA, starterProfile } from "@/lib/outreach/starters"
import { assessTarget } from "@/lib/outreach/scorecard"
import { fetchSiteSignals } from "@/lib/outreach/site-signals"
import { generateOutreachDraft } from "@/lib/outreach/draft"
import { profileFromText, profileFromWebsite, type ProfileDraftResult } from "@/lib/outreach/setup"
import { getContactById, getCompanyById } from "@/lib/queries"
import type {
  Assessment,
  OutreachAudience,
  OutreachDraft,
  OutreachProfile,
  OutreachProfileData,
  OutreachProfileInput,
  TargetFacts,
} from "@/lib/outreach/types"
import type { Company, Contact } from "@/lib/crm-types"

export type SubjectType = "contact" | "company"

type ProfileRow = typeof outreachProfiles.$inferSelect

function toProfile(row: ProfileRow): OutreachProfile {
  const d = (row.data ?? {}) as Partial<OutreachProfileData>
  return {
    id: row.id,
    name: row.name,
    positioning: d.positioning ?? "",
    valueProp: d.valueProp ?? "",
    offerings: d.offerings ?? [],
    verticals: d.verticals ?? [],
    signals: d.signals ?? [],
    approaches: d.approaches ?? [],
    formula: d.formula?.length ? d.formula : DEFAULT_FORMULA,
    doNotSend: d.doNotSend ?? [],
    updatedAt: row.updatedAt.toISOString(),
  }
}

async function workspaceBusinessType(workspaceId: string): Promise<BusinessTypeId> {
  const [ws] = await db
    .select({ businessType: workspaceSettings.businessType })
    .from(workspaceSettings)
    .where(eq(workspaceSettings.workspaceId, workspaceId))
    .limit(1)
  return (ws?.businessType as BusinessTypeId) ?? DEFAULT_BUSINESS_TYPE
}

async function loadActive(workspaceId: string): Promise<ProfileRow | null> {
  const [row] = await db
    .select()
    .from(outreachProfiles)
    .where(and(eq(outreachProfiles.userId, workspaceId), eq(outreachProfiles.isActive, true)))
    .orderBy(desc(outreachProfiles.updatedAt))
    .limit(1)
  return row ?? null
}

async function createFromStarter(workspaceId: string): Promise<ProfileRow> {
  const starter = starterProfile(await workspaceBusinessType(workspaceId))
  const [created] = await db
    .insert(outreachProfiles)
    .values({
      id: randomId("oap"),
      userId: workspaceId,
      name: starter.name,
      isActive: true,
      data: starter.data,
    })
    .returning()
  return created
}

/**
 * The workspace's active outreach playbook. Creates one from an industry starter
 * on first access. Module-gated (upgraded intelligence package).
 */
export async function getOutreachProfile(): Promise<OutreachProfile> {
  const { workspaceId } = await requireModule()
  const row = (await loadActive(workspaceId)) ?? (await createFromStarter(workspaceId))
  return toProfile(row)
}

/** Whole-profile upsert of the active playbook. Module-gated + trial-gated. */
export async function saveOutreachProfile(input: OutreachProfileInput): Promise<OutreachProfile> {
  await requireModule()
  const { workspaceId } = await getActingWriter()
  const row = (await loadActive(workspaceId)) ?? (await createFromStarter(workspaceId))
  const current = toProfile(row)

  const nextData: OutreachProfileData = {
    positioning: input.positioning ?? current.positioning,
    valueProp: input.valueProp ?? current.valueProp,
    offerings: input.offerings ?? current.offerings,
    verticals: input.verticals ?? current.verticals,
    signals: input.signals ?? current.signals,
    approaches: input.approaches ?? current.approaches,
    formula: input.formula ?? current.formula,
    doNotSend: input.doNotSend ?? current.doNotSend,
  }

  const [updated] = await db
    .update(outreachProfiles)
    .set({ name: input.name?.trim() || current.name, data: nextData, updatedAt: new Date() })
    .where(and(eq(outreachProfiles.id, row.id), eq(outreachProfiles.userId, workspaceId)))
    .returning()

  revalidatePath(APP_ROUTES.settings)
  return toProfile(updated)
}

// ── Scorecard + drafting ───────────────────────────────────────────────────────

function contactToFacts(c: Contact): TargetFacts {
  const seniority = (c.seniority || "").toLowerCase()
  const decisionMaker = ["owner", "c-level", "vp", "director"].some((s) => seniority.includes(s))
  return {
    name: c.fullName,
    companyName: c.companyName,
    website: c.websiteUrl,
    industry: c.industry,
    city: c.city,
    state: c.state,
    employeeCount: 0,
    revenueEstimate: "",
    decisionMaker,
    seniority,
    lifecycleStage: c.lifecycleStage,
    // Treat a contact with meaningful booked revenue as a high-value target.
    highValue: c.totalRevenueCents >= 500000,
    tags: c.tags.map((t) => t.name),
  }
}

function companyToFacts(co: Company): TargetFacts {
  return {
    name: co.name,
    companyName: co.name,
    website: co.website,
    industry: co.industry,
    city: co.city,
    state: co.state,
    employeeCount: co.employeeCount,
    revenueEstimate: co.revenueEstimate,
    decisionMaker: false,
    seniority: "",
    lifecycleStage: "",
    highValue: /\b(m|b|million|billion)\b/i.test(co.revenueEstimate || ""),
    tags: [],
  }
}

async function buildFacts(
  subjectType: SubjectType,
  subjectId: string,
  manual?: Record<string, boolean>,
): Promise<TargetFacts> {
  let facts: TargetFacts
  if (subjectType === "contact") {
    const c = await getContactById(subjectId)
    if (!c) throw new Error("Contact not found")
    facts = contactToFacts(c)
  } else {
    const co = await getCompanyById(subjectId)
    if (!co) throw new Error("Company not found")
    facts = companyToFacts(co)
  }
  if (manual) facts.manual = manual
  if (facts.website) {
    const site = await fetchSiteSignals(facts.website)
    if (site) facts.site = site
  }
  return facts
}

/** Score a contact/company against the active playbook. Module-gated. */
export async function assessSubject(
  subjectType: SubjectType,
  subjectId: string,
  audience: OutreachAudience = "sales",
  manual?: Record<string, boolean>,
): Promise<Assessment> {
  const { workspaceId } = await requireModule()
  const row = (await loadActive(workspaceId)) ?? (await createFromStarter(workspaceId))
  const profile = toProfile(row)
  const facts = await buildFacts(subjectType, subjectId, manual)
  return assessTarget(profile, facts, audience)
}

/** Draft a grounded cold email for a target using the playbook. Module-gated. */
export async function draftOutreachEmail(input: {
  subjectType: SubjectType
  subjectId: string
  approachId?: string
  audience?: OutreachAudience
  manual?: Record<string, boolean>
}): Promise<OutreachDraft> {
  const { workspaceId, user } = await requireModule()
  const row = (await loadActive(workspaceId)) ?? (await createFromStarter(workspaceId))
  const profile = toProfile(row)
  const facts = await buildFacts(input.subjectType, input.subjectId, input.manual)
  const assessment = assessTarget(profile, facts, input.audience ?? "sales")
  const approachId = input.approachId || assessment.recommendedApproachId
  const approach = profile.approaches.find((a) => a.id === approachId) ?? profile.approaches[0]
  if (!approach) throw new Error("Add an outreach angle to your playbook first.")
  return generateOutreachDraft({
    profile,
    approach,
    assessment,
    target: { name: facts.name, companyName: facts.companyName },
    senderName: user.name,
  })
}

/** Draft profile fields from the account's own website. Module-gated. Does not persist. */
export async function suggestProfileFromWebsite(url: string): Promise<ProfileDraftResult> {
  await requireModule()
  return profileFromWebsite(url)
}

/** Extract a draft playbook from pasted text. Module-gated. Does not persist. */
export async function suggestProfileFromText(text: string): Promise<ProfileDraftResult> {
  await requireModule()
  return profileFromText(text)
}

export type OutreachStats = {
  members: number
  worked: number
  responded: number
  won: number
  goodProspect: number
  badProspect: number
  becameCustomer: number
}

/**
 * Workspace outreach performance (learning loop v1): how target-list contacts are
 * progressing + prospect-quality feedback. Surfaced in the editor to show whether
 * the playbook is working. Module-gated.
 */
export async function getOutreachStats(): Promise<OutreachStats> {
  const { scopeIds } = await requireModule()

  const rows = await db
    .select({ status: contactGroups.status })
    .from(contactGroups)
    .innerJoin(groups, eq(groups.id, contactGroups.groupId))
    .innerJoin(contacts, eq(contacts.id, contactGroups.contactId))
    .where(
      and(
        eq(groups.type, TARGET_LIST_TYPE),
        workspaceUserIdMatches(groups.userId, scopeIds),
        workspaceUserIdMatches(contacts.userId, scopeIds),
      ),
    )

  let worked = 0
  let responded = 0
  let won = 0
  for (const r of rows) {
    if (isWorkedStatus(r.status)) worked++
    if (isRespondedStatus(r.status)) responded++
    if (r.status === "won") won++
  }

  const fb = await db
    .select({ signal: enrichmentFeedback.signal })
    .from(enrichmentFeedback)
    .where(workspaceUserIdMatches(enrichmentFeedback.userId, scopeIds))
  const count = (sig: string) => fb.filter((f) => f.signal === sig).length

  return {
    members: rows.length,
    worked,
    responded,
    won,
    goodProspect: count("good_prospect"),
    badProspect: count("bad_prospect"),
    becameCustomer: count("became_customer"),
  }
}

/** Reset the active playbook back to the industry starter. Module-gated. */
export async function resetOutreachProfile(): Promise<OutreachProfile> {
  await requireModule()
  const { workspaceId } = await getActingWriter()
  const starter = starterProfile(await workspaceBusinessType(workspaceId))
  const row = await loadActive(workspaceId)
  if (!row) {
    return toProfile(await createFromStarter(workspaceId))
  }
  const [updated] = await db
    .update(outreachProfiles)
    .set({ name: starter.name, data: starter.data, updatedAt: new Date() })
    .where(and(eq(outreachProfiles.id, row.id), eq(outreachProfiles.userId, workspaceId)))
    .returning()
  revalidatePath(APP_ROUTES.settings)
  return toProfile(updated)
}
