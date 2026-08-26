"use server"

import { and, desc, eq } from "drizzle-orm"
import { headers } from "next/headers"
import { revalidatePath } from "next/cache"

import { getActingUser, requireRole, workspaceUserIdMatches } from "@/lib/auth-helpers"
import { requireActiveWorkspace } from "@/lib/entitlements"
import { requireModule, consumeEnrichmentCredit, getModuleState, MODULE_IDS } from "@/lib/modules"
import { db } from "@/lib/db"
import {
  companies,
  contacts,
  enrichmentFeedback,
  enrichmentRuns,
  workspaceSettings,
} from "@/lib/db/schema"
import { randomId } from "@/lib/library-helpers"
import { APP_ROUTES, companyPath, contactPath } from "@/lib/routes"
import { getClayConfig, submitToClay } from "@/lib/enrichment/provider"
import { mockEnrichment } from "@/lib/enrichment/mock"
import { clearEnrichmentForSubject, processEnrichmentResult } from "@/lib/enrichment/process"
import { fitScoreLabel } from "@/lib/enrichment/fit-score"
import type {
  EnrichmentSubjectType,
  FeedbackSignal,
  NormalizedEnrichment,
} from "@/lib/enrichment/types"
import { FEEDBACK_SIGNALS } from "@/lib/enrichment/types"

function appOrigin(h: Headers): string {
  const explicit = process.env.NEXT_PUBLIC_APP_URL?.trim() || process.env.BETTER_AUTH_URL?.trim()
  if (explicit) return explicit.replace(/\/$/, "")
  const proto = h.get("x-forwarded-proto") ?? "https"
  const host = h.get("x-forwarded-host") ?? h.get("host")
  return `${proto}://${host}`
}

// ── Settings (Clay connection) ────────────────────────────────────────────────

export type IntelligenceSettingsInfo = {
  hasWebhook: boolean
  hasCallbackSecret: boolean
  autoEnrichOnIntake: boolean
  platformConfigured: boolean
  /** The URL the user pastes into Clay's HTTP API column to return results. */
  callbackUrl: string
}

export async function getIntelligenceSettings(): Promise<IntelligenceSettingsInfo> {
  const { workspaceId } = await requireRole("Admin")
  const [row] = await db
    .select({
      webhookUrl: workspaceSettings.clayWebhookUrl,
      callbackSecret: workspaceSettings.clayCallbackSecret,
      autoEnrichOnIntake: workspaceSettings.autoEnrichOnIntake,
    })
    .from(workspaceSettings)
    .where(eq(workspaceSettings.workspaceId, workspaceId))
    .limit(1)

  return {
    hasWebhook: Boolean(row?.webhookUrl?.trim()) || Boolean(process.env.CLAY_WEBHOOK_URL?.trim()),
    hasCallbackSecret:
      Boolean(row?.callbackSecret?.trim()) || Boolean(process.env.CLAY_CALLBACK_SECRET?.trim()),
    autoEnrichOnIntake: row?.autoEnrichOnIntake ?? false,
    platformConfigured: Boolean(process.env.CLAY_WEBHOOK_URL?.trim()),
    callbackUrl: `${appOrigin(await headers())}/api/webhooks/clay`,
  }
}

/**
 * Send a sample record to the configured Clay table to confirm Nula can reach
 * it. This verifies the outbound leg; the return leg (Clay's HTTP API column
 * posting back to the callback URL) is confirmed by running a real enrichment.
 */
export async function testIntelligenceConnection(): Promise<{ ok: boolean; message: string }> {
  const { workspaceId } = await requireRole("Admin")
  const config = await getClayConfig(workspaceId)
  if (!config.configured) {
    return {
      ok: false,
      message:
        "No webhook URL saved yet. Paste your Clay table's webhook URL above and save first.",
    }
  }
  const callbackUrl = `${appOrigin(await headers())}/api/webhooks/clay`
  try {
    await submitToClay(config, {
      correlationId: `test_${randomId("t")}`,
      callbackUrl,
      subjectType: "contact",
      firstName: "Nula",
      lastName: "Connection Test",
      companyName: "Nula Connection Test",
      email: "test@example.com",
    })
    return {
      ok: true,
      message:
        "Success — Nula reached your Clay table. Look for a new “Nula Connection Test” row in Clay, then make sure your HTTP API column posts back to the callback URL.",
    }
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : "Could not reach that URL." }
  }
}

export async function updateIntelligenceSettings(input: {
  clayWebhookUrl?: string
  clayAuthToken?: string
  clayCallbackSecret?: string
  autoEnrichOnIntake?: boolean
  clearWebhook?: boolean
}): Promise<IntelligenceSettingsInfo> {
  const { workspaceId } = await requireRole("Admin")

  const set: Partial<typeof workspaceSettings.$inferInsert> = { updatedAt: new Date() }
  if (input.clearWebhook) {
    set.clayWebhookUrl = ""
    set.clayAuthToken = ""
  } else {
    if (input.clayWebhookUrl?.trim()) set.clayWebhookUrl = input.clayWebhookUrl.trim()
    if (input.clayAuthToken?.trim()) set.clayAuthToken = input.clayAuthToken.trim()
  }
  if (input.clayCallbackSecret?.trim()) set.clayCallbackSecret = input.clayCallbackSecret.trim()
  if (input.autoEnrichOnIntake !== undefined) set.autoEnrichOnIntake = input.autoEnrichOnIntake

  await db
    .insert(workspaceSettings)
    .values({ workspaceId, ...set })
    .onConflictDoUpdate({ target: workspaceSettings.workspaceId, set })

  revalidatePath(APP_ROUTES.settings)
  return getIntelligenceSettings()
}

// ── Enrich ────────────────────────────────────────────────────────────────────

export type EnrichmentResult = { status: "pending" | "enriched"; creditsRemaining: number }

async function runEnrichment(
  subjectType: EnrichmentSubjectType,
  subjectId: string,
  subject: {
    firstName?: string
    lastName?: string
    companyName?: string
    email?: string
    phone?: string
    website?: string
    city?: string
    state?: string
  },
): Promise<EnrichmentResult> {
  // Two gates: base plan write access + the paid module.
  const acting = await requireModule(MODULE_IDS.b2bIntelligence)
  await requireActiveWorkspace(acting.workspaceId)
  await consumeEnrichmentCredit(acting.workspaceId, MODULE_IDS.b2bIntelligence)

  const correlationId = randomId("enr")
  const config = await getClayConfig(acting.workspaceId)
  const callbackUrl = `${appOrigin(await headers())}/api/webhooks/clay`

  const [run] = await db
    .insert(enrichmentRuns)
    .values({
      id: randomId("run"),
      userId: acting.workspaceId,
      subjectType,
      subjectId,
      provider: "clay",
      correlationId,
      status: "pending",
      requestPayload: { ...subject, callbackUrl },
      requestedBy: acting.user.id,
    })
    .returning()

  const table = subjectType === "contact" ? contacts : companies
  await db.update(table).set({ enrichmentStatus: "pending" }).where(eq(table.id, subjectId))

  const moduleState = await getModuleState(MODULE_IDS.b2bIntelligence)

  if (config.configured) {
    await submitToClay(config, {
      correlationId,
      callbackUrl,
      subjectType,
      ...subject,
    })
    revalidateSubject(subjectType, subjectId)
    return { status: "pending", creditsRemaining: moduleState.creditsRemaining }
  }

  // Dev/no-Clay fallback: synthesize a plausible result and process it inline so
  // the full flow is demonstrable end-to-end.
  const normalized: NormalizedEnrichment = mockEnrichment(subject)
  await processEnrichmentResult(run!, { mock: true, ...normalized } as Record<string, unknown>, normalized)
  revalidateSubject(subjectType, subjectId)
  return { status: "enriched", creditsRemaining: moduleState.creditsRemaining }
}

function revalidateSubject(subjectType: EnrichmentSubjectType, subjectId: string) {
  if (subjectType === "contact") revalidatePath(contactPath(subjectId))
  else revalidatePath(companyPath(subjectId))
  revalidatePath(APP_ROUTES.contacts)
}

export async function enrichContact(contactId: string): Promise<EnrichmentResult> {
  const { scopeIds } = await getActingUser()
  const [c] = await db
    .select()
    .from(contacts)
    .where(and(eq(contacts.id, contactId), workspaceUserIdMatches(contacts.userId, scopeIds)))
    .limit(1)
  if (!c) throw new Error("Contact not found")

  return runEnrichment("contact", contactId, {
    firstName: c.firstName,
    lastName: c.lastName,
    companyName: c.companyName,
    email: c.email,
    phone: c.phone,
    website: c.websiteUrl,
    city: c.city,
    state: c.state,
  })
}

export async function enrichCompany(companyId: string): Promise<EnrichmentResult> {
  const { scopeIds } = await getActingUser()
  const [co] = await db
    .select()
    .from(companies)
    .where(and(eq(companies.id, companyId), workspaceUserIdMatches(companies.userId, scopeIds)))
    .limit(1)
  if (!co) throw new Error("Company not found")

  return runEnrichment("company", companyId, {
    companyName: co.name,
    phone: co.phone,
    website: co.website,
    city: co.city,
    state: co.state,
  })
}

// ── View + feedback ─────────────────────────────────────────────────────────

export type EnrichmentField = { label: string; value: string }

export type EnrichmentView = {
  status: string
  enrichedAt: string | null
  fitScore: number
  fitLabel: string
  summary: string
  recommendation: string
  fields: EnrichmentField[]
  feedback: FeedbackSignal[]
  creditsRemaining: number
}

function viewFields(n: NormalizedEnrichment): EnrichmentField[] {
  const f: EnrichmentField[] = []
  if (n.industry) f.push({ label: "Industry", value: n.subIndustry ? `${n.industry} → ${n.subIndustry}` : n.industry })
  if (n.companySize) f.push({ label: "Company size", value: n.companySize })
  if (n.employeeCount) f.push({ label: "Employees", value: String(n.employeeCount) })
  if (n.revenueEstimate) f.push({ label: "Revenue (est.)", value: n.revenueEstimate })
  if (n.title) f.push({ label: "Title", value: n.title })
  if (n.market) f.push({ label: "Market", value: n.market })
  if (n.companyType) f.push({ label: "Company type", value: n.companyType })
  if (n.techStack?.length) f.push({ label: "Tech stack", value: n.techStack.join(", ") })
  if (n.growthSignals?.length) f.push({ label: "Signals", value: n.growthSignals.join(", ") })
  return f
}

export async function getEnrichmentView(
  subjectType: EnrichmentSubjectType,
  subjectId: string,
): Promise<EnrichmentView | null> {
  const { workspaceId, scopeIds } = await getActingUser()

  const [run] = await db
    .select()
    .from(enrichmentRuns)
    .where(
      and(
        eq(enrichmentRuns.userId, workspaceId),
        eq(enrichmentRuns.subjectType, subjectType),
        eq(enrichmentRuns.subjectId, subjectId),
      ),
    )
    .orderBy(desc(enrichmentRuns.requestedAt))
    .limit(1)

  const moduleState = await getModuleState(MODULE_IDS.b2bIntelligence)
  if (!run) return null

  const feedbackRows = await db
    .select({ signal: enrichmentFeedback.signal })
    .from(enrichmentFeedback)
    .where(
      and(
        eq(enrichmentFeedback.subjectType, subjectType),
        eq(enrichmentFeedback.subjectId, subjectId),
        workspaceUserIdMatches(enrichmentFeedback.userId, scopeIds),
      ),
    )

  // Pull the display summary/recommendation from the subject row.
  let summary = ""
  let recommendation = ""
  if (subjectType === "contact") {
    const [c] = await db
      .select({ aiSummary: contacts.aiSummary, rec: contacts.recommendedNextAction })
      .from(contacts)
      .where(eq(contacts.id, subjectId))
      .limit(1)
    summary = c?.aiSummary ?? ""
    recommendation = c?.rec ?? ""
  } else {
    const [co] = await db
      .select({ description: companies.description })
      .from(companies)
      .where(eq(companies.id, subjectId))
      .limit(1)
    summary = co?.description ?? ""
  }

  // Normalize the run's lifecycle status to the view's vocabulary the card uses
  // ("completed" run → "enriched" record).
  const status = run.status === "completed" ? "enriched" : run.status
  return {
    status,
    enrichedAt: run.completedAt?.toISOString() ?? null,
    fitScore: run.fitScore,
    fitLabel: fitScoreLabel(run.fitScore),
    summary,
    recommendation,
    fields: viewFields(run.normalized),
    feedback: feedbackRows.map((r) => r.signal as FeedbackSignal),
    creditsRemaining: moduleState.creditsRemaining,
  }
}

export async function submitEnrichmentFeedback(input: {
  subjectType: EnrichmentSubjectType
  subjectId: string
  signal: FeedbackSignal
}): Promise<{ ok: true; cleared: boolean }> {
  const acting = await requireModule(MODULE_IDS.b2bIntelligence)
  if (!FEEDBACK_SIGNALS.includes(input.signal)) throw new Error("Unknown feedback signal")

  const table = input.subjectType === "contact" ? contacts : companies
  const [subject] = await db
    .select({ fitScore: table.fitScore })
    .from(table)
    .where(and(eq(table.id, input.subjectId), workspaceUserIdMatches(table.userId, acting.scopeIds)))
    .limit(1)
  if (!subject) throw new Error("Record not found")

  const [run] = await db
    .select({ id: enrichmentRuns.id })
    .from(enrichmentRuns)
    .where(
      and(
        eq(enrichmentRuns.userId, acting.workspaceId),
        eq(enrichmentRuns.subjectType, input.subjectType),
        eq(enrichmentRuns.subjectId, input.subjectId),
      ),
    )
    .orderBy(desc(enrichmentRuns.requestedAt))
    .limit(1)

  await db.insert(enrichmentFeedback).values({
    id: randomId("efb"),
    userId: acting.workspaceId,
    subjectType: input.subjectType,
    subjectId: input.subjectId,
    runId: run?.id ?? "",
    signal: input.signal,
    fitScoreAtFeedback: subject.fitScore ?? 0,
    createdBy: acting.user.id,
  })

  // "Info wrong" also clears the enrichment so bad data doesn't stick around.
  let cleared = false
  if (input.signal === "contact_incorrect") {
    await clearEnrichmentForSubject(acting.workspaceId, input.subjectType, input.subjectId)
    cleared = true
  }

  revalidateSubject(input.subjectType, input.subjectId)
  return { ok: true, cleared }
}
