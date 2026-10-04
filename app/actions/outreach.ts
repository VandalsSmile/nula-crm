"use server"

import { and, desc, eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"

import { db } from "@/lib/db"
import { outreachProfiles, workspaceSettings } from "@/lib/db/schema"
import { getActingWriter } from "@/lib/entitlements"
import { requireModule } from "@/lib/modules"
import { randomId } from "@/lib/library-helpers"
import { APP_ROUTES } from "@/lib/routes"
import { DEFAULT_BUSINESS_TYPE, type BusinessTypeId } from "@/lib/crm-defaults"
import { DEFAULT_FORMULA, starterProfile } from "@/lib/outreach/starters"
import type { OutreachProfile, OutreachProfileData, OutreachProfileInput } from "@/lib/outreach/types"

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
