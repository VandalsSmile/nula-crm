"use server"

import { and, eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"

import { db } from "@/lib/db"
import { campaigns, contactGroups, groups, tags, workspaceSettings } from "@/lib/db/schema"
import { getActingUser, workspaceUserIdMatches } from "@/lib/auth-helpers"
import { APP_ROUTES } from "@/lib/routes"
import { DEFAULT_GROUPS, DEFAULT_TAGS, slugifyTag, type BusinessTypeId } from "@/lib/crm-defaults"
import { seedDefaultAutomations } from "@/lib/automations/engine"
import { randomId } from "@/lib/library-helpers"

export async function seedWorkspaceDefaults(businessType: BusinessTypeId = "iv-therapy") {
  const { workspaceId, scopeIds } = await getActingUser()

  const [existing] = await db
    .select()
    .from(workspaceSettings)
    .where(eq(workspaceSettings.workspaceId, workspaceId))
    .limit(1)

  if (existing?.onboardingComplete) return { ok: true, seeded: false }

  const groupNames = DEFAULT_GROUPS[businessType] ?? DEFAULT_GROUPS["iv-therapy"]
  const tagNames = DEFAULT_TAGS[businessType] ?? DEFAULT_TAGS["iv-therapy"]

  for (const name of groupNames) {
    const slug = slugifyTag(name)
    const [found] = await db
      .select({ id: groups.id })
      .from(groups)
      .where(and(workspaceUserIdMatches(groups.userId, scopeIds), eq(groups.slug, slug)))
      .limit(1)
    if (!found) {
      await db.insert(groups).values({
        id: randomId("g"),
        userId: workspaceId,
        name,
        slug,
        description: `Default ${businessType} group`,
        type: "audience",
        isSystem: true,
      })
    }
  }

  for (const name of tagNames) {
    const slug = slugifyTag(name)
    const [found] = await db
      .select({ id: tags.id })
      .from(tags)
      .where(and(workspaceUserIdMatches(tags.userId, scopeIds), eq(tags.slug, slug)))
      .limit(1)
    if (!found) {
      await db.insert(tags).values({
        id: randomId("t"),
        userId: workspaceId,
        name,
        slug,
        description: `Default ${businessType} tag`,
      })
    }
  }

  await db
    .insert(workspaceSettings)
    .values({
      workspaceId,
      businessType,
      onboardingComplete: true,
    })
    .onConflictDoUpdate({
      target: workspaceSettings.workspaceId,
      set: { businessType, onboardingComplete: true, updatedAt: new Date() },
    })

  await seedDefaultAutomations(workspaceId)

  revalidatePath(APP_ROUTES.groups)
  revalidatePath(APP_ROUTES.tags)
  revalidatePath(APP_ROUTES.dashboard)
  return { ok: true, seeded: true }
}

export async function updateWorkspaceSettings(input: { businessType?: BusinessTypeId }) {
  const { workspaceId } = await getActingUser()

  const [row] = await db
    .insert(workspaceSettings)
    .values({
      workspaceId,
      businessType: input.businessType ?? "iv-therapy",
      onboardingComplete: true,
    })
    .onConflictDoUpdate({
      target: workspaceSettings.workspaceId,
      set: {
        businessType: input.businessType ?? "iv-therapy",
        updatedAt: new Date(),
      },
    })
    .returning()

  revalidatePath(APP_ROUTES.settings)
  return row
}

export async function createCampaignDraft(input: {
  name: string
  type: string
  goal: string
  audience: string
  groupId?: string
}) {
  const { workspaceId } = await getActingUser()
  const [row] = await db
    .insert(campaigns)
    .values({
      id: randomId("cmp"),
      userId: workspaceId,
      name: input.name,
      type: input.type,
      goal: input.goal,
      audience: input.audience,
      groupId: input.groupId ?? null,
      status: "draft",
      sequence: [
        { step: 1, channel: "email", subject: "We haven't seen you in a while", delayDays: 0 },
        { step: 2, channel: "sms", body: "Quick reminder — we'd love to see you again.", delayDays: 3 },
      ],
    })
    .returning()
  revalidatePath(APP_ROUTES.campaigns)
  return row
}

export async function getGroupMemberCount(groupId: string) {
  const { scopeIds } = await getActingUser()
  const rows = await db
    .select({ contactId: contactGroups.contactId })
    .from(contactGroups)
    .innerJoin(groups, eq(groups.id, contactGroups.groupId))
    .where(and(eq(contactGroups.groupId, groupId), workspaceUserIdMatches(groups.userId, scopeIds)))
  return rows.length
}
