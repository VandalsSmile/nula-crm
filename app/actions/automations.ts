"use server"

import { and, eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"

import { db } from "@/lib/db"
import { automations } from "@/lib/db/schema"
import { getActingUser, workspaceUserIdMatches } from "@/lib/auth-helpers"
import { APP_ROUTES } from "@/lib/routes"
import { randomId } from "@/lib/library-helpers"
import {
  runInactiveCustomerAutomation,
  seedDefaultAutomations,
} from "@/lib/automations/engine"

export async function listAutomations() {
  const { workspaceId, scopeIds } = await getActingUser()
  await seedDefaultAutomations(workspaceId)

  const rows = await db
    .select()
    .from(automations)
    .where(workspaceUserIdMatches(automations.userId, scopeIds))
    .orderBy(automations.name)

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    trigger: r.trigger,
    action: r.action,
    enabled: r.enabled,
    lastRunAt: r.lastRunAt?.toISOString() ?? null,
    config: r.config,
  }))
}

export async function toggleAutomation(automationId: string, enabled: boolean) {
  const { scopeIds } = await getActingUser()
  await db
    .update(automations)
    .set({ enabled })
    .where(and(eq(automations.id, automationId), workspaceUserIdMatches(automations.userId, scopeIds)))
  revalidatePath(APP_ROUTES.automations)
  return { ok: true }
}

export type AutomationInput = {
  name: string
  trigger: string
  action: string
  config?: Record<string, unknown>
  enabled?: boolean
}

export async function createAutomation(input: AutomationInput) {
  const { workspaceId } = await getActingUser()
  const name = input.name.trim()
  if (!name) throw new Error("Automation name is required")

  const [row] = await db
    .insert(automations)
    .values({
      id: randomId("auto"),
      userId: workspaceId,
      name,
      trigger: input.trigger,
      action: input.action,
      config: input.config ?? {},
      enabled: input.enabled ?? true,
    })
    .returning()

  revalidatePath(APP_ROUTES.automations)
  return row
}

export async function updateAutomation(automationId: string, input: Partial<AutomationInput>) {
  const { scopeIds } = await getActingUser()
  const patch: Record<string, string | boolean | Record<string, unknown>> = {}
  if (input.name !== undefined) patch.name = input.name.trim()
  if (input.trigger !== undefined) patch.trigger = input.trigger
  if (input.action !== undefined) patch.action = input.action
  if (input.config !== undefined) patch.config = input.config
  if (input.enabled !== undefined) patch.enabled = input.enabled

  const [row] = await db
    .update(automations)
    .set(patch)
    .where(and(eq(automations.id, automationId), workspaceUserIdMatches(automations.userId, scopeIds)))
    .returning()
  if (!row) throw new Error("Automation not found")

  revalidatePath(APP_ROUTES.automations)
  return row
}

export async function deleteAutomation(automationId: string) {
  const { scopeIds } = await getActingUser()
  const [row] = await db
    .select()
    .from(automations)
    .where(and(eq(automations.id, automationId), workspaceUserIdMatches(automations.userId, scopeIds)))
    .limit(1)
  if (!row) throw new Error("Automation not found")

  await db.delete(automations).where(eq(automations.id, automationId))
  revalidatePath(APP_ROUTES.automations)
  return { ok: true }
}

export async function runInactiveDetectionNow() {
  const { workspaceId } = await getActingUser()
  const result = await runInactiveCustomerAutomation(workspaceId)
  revalidatePath(APP_ROUTES.automations)
  revalidatePath(APP_ROUTES.dashboard)
  revalidatePath(APP_ROUTES.campaigns)
  return result
}
