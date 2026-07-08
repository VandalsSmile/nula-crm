"use server"

import { and, eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { after } from "next/server"

import { db } from "@/lib/db"
import { campaigns, contactGroups, groups, tags, workspaceSettings } from "@/lib/db/schema"
import { getActingUser, requireRole, workspaceUserIdMatches } from "@/lib/auth-helpers"
import { APP_ROUTES } from "@/lib/routes"
import {
  DEFAULT_BUSINESS_TYPE,
  DEFAULT_GROUPS,
  DEFAULT_TAGS,
  slugifyTag,
  type BusinessTypeId,
} from "@/lib/crm-defaults"
import { seedDefaultAutomations } from "@/lib/automations/engine"
import { randomId } from "@/lib/library-helpers"

export type CompanyProfile = {
  businessType: BusinessTypeId
  companyName: string
  website: string
  phone: string
  supportEmail: string
  address: string
  timezone: string
}

/** Idempotently seeds the default groups + tags for a business type. */
async function seedGroupsAndTags(
  workspaceId: string,
  scopeIds: string[],
  businessType: BusinessTypeId,
) {
  const groupNames = DEFAULT_GROUPS[businessType] ?? DEFAULT_GROUPS[DEFAULT_BUSINESS_TYPE]
  const tagNames = DEFAULT_TAGS[businessType] ?? DEFAULT_TAGS[DEFAULT_BUSINESS_TYPE]

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
        description: "Default group",
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
        description: "Default tag",
      })
    }
  }
}

export async function seedWorkspaceDefaults(businessType?: BusinessTypeId) {
  const { workspaceId, scopeIds } = await getActingUser()

  const [existing] = await db
    .select()
    .from(workspaceSettings)
    .where(eq(workspaceSettings.workspaceId, workspaceId))
    .limit(1)

  if (existing?.onboardingComplete) return { ok: true, seeded: false }

  // Use the explicitly requested type, then any already-saved choice, then the
  // industry-neutral default — never a hardcoded wellness type.
  const resolved =
    businessType ?? (existing?.businessType as BusinessTypeId) ?? DEFAULT_BUSINESS_TYPE

  await seedGroupsAndTags(workspaceId, scopeIds, resolved)

  await db
    .insert(workspaceSettings)
    .values({
      workspaceId,
      businessType: resolved,
      onboardingComplete: true,
    })
    .onConflictDoUpdate({
      target: workspaceSettings.workspaceId,
      set: { businessType: resolved, onboardingComplete: true, updatedAt: new Date() },
    })

  await seedDefaultAutomations(workspaceId)

  // seedWorkspaceDefaults runs during the dashboard's server render on first
  // load. revalidatePath is not allowed during render, so defer the cache
  // invalidation to after the response is sent (supported via `after`).
  after(() => {
    revalidatePath(APP_ROUTES.groups)
    revalidatePath(APP_ROUTES.tags)
    revalidatePath(APP_ROUTES.dashboard)
  })
  return { ok: true, seeded: true }
}

export async function getCompanyProfile(): Promise<CompanyProfile> {
  const { workspaceId } = await getActingUser()
  const [row] = await db
    .select()
    .from(workspaceSettings)
    .where(eq(workspaceSettings.workspaceId, workspaceId))
    .limit(1)
  return {
    businessType: (row?.businessType ?? DEFAULT_BUSINESS_TYPE) as BusinessTypeId,
    companyName: row?.companyName ?? "",
    website: row?.website ?? "",
    phone: row?.phone ?? "",
    supportEmail: row?.supportEmail ?? "",
    address: row?.address ?? "",
    timezone: row?.timezone ?? "America/New_York",
  }
}

/** @deprecated use getCompanyProfile — kept for existing callers. */
export async function getWorkspaceSettingsInfo(): Promise<{ businessType: BusinessTypeId }> {
  const { businessType } = await getCompanyProfile()
  return { businessType }
}

export async function updateWorkspaceSettings(input: Partial<CompanyProfile>) {
  const { workspaceId, scopeIds } = await requireRole("Admin")

  const set: Record<string, string | Date> = { updatedAt: new Date() }
  if (input.businessType !== undefined) set.businessType = input.businessType
  if (input.companyName !== undefined) set.companyName = input.companyName.trim()
  if (input.website !== undefined) set.website = input.website.trim()
  if (input.phone !== undefined) set.phone = input.phone.trim()
  if (input.supportEmail !== undefined) set.supportEmail = input.supportEmail.trim()
  if (input.address !== undefined) set.address = input.address.trim()
  if (input.timezone !== undefined) set.timezone = input.timezone.trim()

  const [row] = await db
    .insert(workspaceSettings)
    .values({
      workspaceId,
      businessType: input.businessType ?? DEFAULT_BUSINESS_TYPE,
      companyName: input.companyName?.trim() ?? "",
      website: input.website?.trim() ?? "",
      phone: input.phone?.trim() ?? "",
      supportEmail: input.supportEmail?.trim() ?? "",
      address: input.address?.trim() ?? "",
      timezone: input.timezone?.trim() || "America/New_York",
      onboardingComplete: true,
    })
    .onConflictDoUpdate({ target: workspaceSettings.workspaceId, set })
    .returning()

  // Selecting an industry seeds its default groups/tags (idempotent).
  if (input.businessType !== undefined) {
    await seedGroupsAndTags(workspaceId, scopeIds, input.businessType)
    revalidatePath(APP_ROUTES.groups)
    revalidatePath(APP_ROUTES.tags)
  }

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
