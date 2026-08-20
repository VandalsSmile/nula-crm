import "server-only"

import { and, eq } from "drizzle-orm"

import { getActingUser, getWorkspaceId } from "@/lib/auth-helpers"
import { db } from "@/lib/db"
import { workspaceAddons } from "@/lib/db/schema"

/** Paid add-on modules that gate optional capabilities. */
export const MODULE_IDS = {
  b2bIntelligence: "b2b_intelligence",
} as const

export type ModuleId = (typeof MODULE_IDS)[keyof typeof MODULE_IDS]

export const MODULE_DISABLED_MESSAGE =
  "The B2B Intelligence add-on isn't enabled for this workspace. Enable it in Settings → Plan."

export const CREDITS_EXHAUSTED_MESSAGE =
  "You've used all your enrichment credits for this month. They reset at the start of your next billing period."

/** Default monthly enrichment credit allowance for a new add-on subscription. */
export const DEFAULT_CREDIT_LIMIT = 250

/** 30-day metering window. */
const PERIOD_MS = 30 * 24 * 60 * 60 * 1000

export type ModuleState = {
  addonId: ModuleId
  enabled: boolean
  status: string
  renewsAt: string | null
  creditsUsed: number
  creditLimit: number
  creditsRemaining: number
}

type AddonRow = typeof workspaceAddons.$inferSelect

/**
 * An add-on grants access while active/trialing/past_due, or while canceled but
 * still inside the paid period (grace access until `currentPeriodEnd`).
 */
function isActiveStatus(status: string, currentPeriodEnd: Date | null): boolean {
  const s = (status || "").toLowerCase()
  // "comped" = complimentary access granted by a super admin (no charge).
  if (s === "active" || s === "trialing" || s === "past_due" || s === "comped") return true
  if (s === "canceled" && currentPeriodEnd && currentPeriodEnd.getTime() > Date.now()) return true
  return false
}

async function loadAddon(workspaceId: string, addonId: ModuleId): Promise<AddonRow | null> {
  const [row] = await db
    .select()
    .from(workspaceAddons)
    .where(and(eq(workspaceAddons.workspaceId, workspaceId), eq(workspaceAddons.addonId, addonId)))
    .limit(1)
  return row ?? null
}

export async function isModuleEnabled(
  workspaceId: string,
  addonId: ModuleId = MODULE_IDS.b2bIntelligence,
): Promise<boolean> {
  const row = await loadAddon(workspaceId, addonId)
  if (!row) return false
  return isActiveStatus(row.status, row.currentPeriodEnd)
}

/** Guard for module-gated server actions. Throws when the add-on isn't enabled. */
export async function requireModule(addonId: ModuleId = MODULE_IDS.b2bIntelligence) {
  const acting = await getActingUser()
  if (!(await isModuleEnabled(acting.workspaceId, addonId))) {
    throw new Error(MODULE_DISABLED_MESSAGE)
  }
  return acting
}

function computeCredits(row: AddonRow | null): {
  used: number
  limit: number
  remaining: number
  needsReset: boolean
} {
  const limit = row?.creditLimit ?? DEFAULT_CREDIT_LIMIT
  const needsReset = Boolean(row?.periodResetAt && row.periodResetAt.getTime() <= Date.now())
  const used = needsReset ? 0 : row?.creditsUsedThisPeriod ?? 0
  return { used, limit, remaining: Math.max(0, limit - used), needsReset }
}

/** UI-facing snapshot of a workspace's module state (safe to return to client). */
export async function getModuleState(
  addonId: ModuleId = MODULE_IDS.b2bIntelligence,
): Promise<ModuleState> {
  const workspaceId = await getWorkspaceId()
  const row = await loadAddon(workspaceId, addonId)
  const enabled = row ? isActiveStatus(row.status, row.currentPeriodEnd) : false
  const { used, limit, remaining } = computeCredits(row)
  return {
    addonId,
    enabled,
    status: row?.status ?? "",
    renewsAt: row?.currentPeriodEnd?.toISOString() ?? null,
    creditsUsed: used,
    creditLimit: limit,
    creditsRemaining: remaining,
  }
}

/**
 * Consume one enrichment credit for the workspace, resetting the monthly window
 * lazily. Throws when the module is off or no credits remain. Call this inside a
 * module-gated action right before submitting an enrichment.
 */
export async function consumeEnrichmentCredit(
  workspaceId: string,
  addonId: ModuleId = MODULE_IDS.b2bIntelligence,
): Promise<void> {
  const row = await loadAddon(workspaceId, addonId)
  if (!row || !isActiveStatus(row.status, row.currentPeriodEnd)) {
    throw new Error(MODULE_DISABLED_MESSAGE)
  }
  const { used, remaining, needsReset } = computeCredits(row)
  if (remaining <= 0) throw new Error(CREDITS_EXHAUSTED_MESSAGE)

  await db
    .update(workspaceAddons)
    .set({
      creditsUsedThisPeriod: used + 1,
      periodResetAt: needsReset || !row.periodResetAt ? new Date(Date.now() + PERIOD_MS) : row.periodResetAt,
      updatedAt: new Date(),
    })
    .where(and(eq(workspaceAddons.workspaceId, workspaceId), eq(workspaceAddons.addonId, addonId)))
}
