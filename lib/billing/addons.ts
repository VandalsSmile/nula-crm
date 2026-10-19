import "server-only"

import { and, eq } from "drizzle-orm"

import { db } from "@/lib/db"
import { workspaceAddons } from "@/lib/db/schema"
import { addonByPriceId } from "@/lib/billing/plans"
import { DEFAULT_CREDIT_LIMIT, MODULE_IDS, type ModuleId } from "@/lib/modules"
import { randomId } from "@/lib/library-helpers"

/** Stripe subscription statuses that grant full access. */
const ACTIVE_STATUSES = new Set(["ACTIVE", "TRIALING", "PAST_DUE"])

const PERIOD_MS = 30 * 24 * 60 * 60 * 1000

export type AddonSubscriptionState = {
  subscriptionId: string
  customerId: string
  status: string
  priceId: string
  currentPeriodEnd: Date | null
  cancelAtPeriodEnd?: boolean
}

/**
 * Upsert an add-on subscription onto its own `workspace_addons` row. This never
 * touches the base plan columns on `workspace_settings`.
 */
export async function applyAddonSubscription(
  workspaceId: string,
  sub: AddonSubscriptionState,
  enabledBy = "",
  executor: Pick<typeof db, "insert" | "update" | "select"> = db,
): Promise<void> {
  const addon = addonByPriceId(sub.priceId)
  const addonId: ModuleId = (addon?.addonId as ModuleId) ?? MODULE_IDS.b2bIntelligence
  const active = ACTIVE_STATUSES.has(sub.status.toUpperCase())

  const [existing] = await executor
    .select({ id: workspaceAddons.id, status: workspaceAddons.status })
    .from(workspaceAddons)
    .where(and(eq(workspaceAddons.workspaceId, workspaceId), eq(workspaceAddons.addonId, addonId)))
    .limit(1)

  if (existing?.status === "comped") return

  const set = {
    status: active ? "active" : sub.status.toLowerCase(),
    stripeSubscriptionId: sub.subscriptionId,
    stripeCustomerId: sub.customerId,
    priceId: sub.priceId,
    currentPeriodEnd: sub.currentPeriodEnd,
    cancelAtPeriodEnd: sub.cancelAtPeriodEnd ?? false,
    creditLimit: addon?.creditLimit ?? DEFAULT_CREDIT_LIMIT,
    updatedAt: new Date(),
  }

  if (existing) {
    await executor.update(workspaceAddons).set(set).where(eq(workspaceAddons.id, existing.id))
  } else {
    await executor.insert(workspaceAddons).values({
      id: randomId("addon"),
      workspaceId,
      addonId,
      enabledBy,
      periodResetAt: new Date(Date.now() + PERIOD_MS),
      ...set,
    })
  }
}

/** Mark an add-on canceled (access continues until currentPeriodEnd via grace logic). */
export async function clearAddonSubscription(
  workspaceId: string,
  addonId: ModuleId = MODULE_IDS.b2bIntelligence,
): Promise<void> {
  await db
    .update(workspaceAddons)
    .set({ status: "canceled", updatedAt: new Date() })
    .where(and(eq(workspaceAddons.workspaceId, workspaceId), eq(workspaceAddons.addonId, addonId)))
}

/** Dev/no-Stripe fallback: enable the module immediately without checkout. */
export async function enableAddonLocally(
  workspaceId: string,
  addonId: ModuleId = MODULE_IDS.b2bIntelligence,
  enabledBy = "",
): Promise<void> {
  const [existing] = await db
    .select({ id: workspaceAddons.id })
    .from(workspaceAddons)
    .where(and(eq(workspaceAddons.workspaceId, workspaceId), eq(workspaceAddons.addonId, addonId)))
    .limit(1)

  const set = {
    status: "active",
    currentPeriodEnd: new Date(Date.now() + PERIOD_MS),
    creditLimit: DEFAULT_CREDIT_LIMIT,
    updatedAt: new Date(),
  }

  if (existing) {
    await db.update(workspaceAddons).set(set).where(eq(workspaceAddons.id, existing.id))
  } else {
    await db.insert(workspaceAddons).values({
      id: randomId("addon"),
      workspaceId,
      addonId,
      enabledBy,
      periodResetAt: new Date(Date.now() + PERIOD_MS),
      ...set,
    })
  }
}

/** Comp credit allowance for super-admin-enabled workspaces (generous, free). */
const COMP_CREDIT_LIMIT = 5000

/**
 * Super-admin override: grant or revoke complimentary ("comped") access to an
 * add-on module — no Stripe subscription, no charge. Revoking sets the row to
 * canceled with access ended immediately.
 */
export async function setAddonComp(
  workspaceId: string,
  comped: boolean,
  addonId: ModuleId = MODULE_IDS.b2bIntelligence,
  enabledBy = "",
): Promise<void> {
  const [existing] = await db
    .select({ id: workspaceAddons.id })
    .from(workspaceAddons)
    .where(and(eq(workspaceAddons.workspaceId, workspaceId), eq(workspaceAddons.addonId, addonId)))
    .limit(1)

  const set = comped
    ? {
        status: "comped",
        stripeSubscriptionId: "",
        priceId: "",
        currentPeriodEnd: null,
        creditLimit: COMP_CREDIT_LIMIT,
        periodResetAt: new Date(Date.now() + PERIOD_MS),
        updatedAt: new Date(),
      }
    : { status: "canceled", currentPeriodEnd: null, updatedAt: new Date() }

  if (existing) {
    await db.update(workspaceAddons).set(set).where(eq(workspaceAddons.id, existing.id))
  } else if (comped) {
    await db.insert(workspaceAddons).values({
      id: randomId("addon"),
      workspaceId,
      addonId,
      enabledBy,
      ...set,
    })
  }
}

export async function findWorkspaceByAddonCustomer(customerId: string): Promise<string | null> {
  if (!customerId) return null
  const [row] = await db
    .select({ workspaceId: workspaceAddons.workspaceId })
    .from(workspaceAddons)
    .where(eq(workspaceAddons.stripeCustomerId, customerId))
    .limit(1)
  return row?.workspaceId ?? null
}
