import "server-only"

import { and, eq, inArray, or, sql } from "drizzle-orm"

import { db } from "@/lib/db"
import {
  activities,
  automations,
  contactGroups,
  contactTags,
  contacts,
  groups,
  tags,
} from "@/lib/db/schema"
import { workspaceUserIdMatches, getWorkspaceScopeIds } from "@/lib/workspace-scope"
import { slugifyTag } from "@/lib/crm-defaults"
import { randomId } from "@/lib/library-helpers"
import { createCampaignDraftForWorkspace } from "@/lib/campaigns/drafts"

export const DEFAULT_AUTOMATIONS = [
  {
    name: "New Lead Follow-Up",
    trigger: "form_submitted",
    action: "new_lead_sequence",
    config: { groupName: "New Leads", tagSlug: "needs-follow-up" },
  },
  {
    name: "Inactive Customer Detection",
    trigger: "cron_daily",
    action: "mark_inactive_90",
    config: { days: 90, groupName: "Inactive 90 Days", tagSlug: "inactive-90" },
  },
  {
    name: "Review Request",
    trigger: "purchase_made",
    action: "review_request",
    config: { delayHours: 24 },
  },
  {
    name: "High-Intent Alert",
    trigger: "lead_scored",
    action: "high_intent_alert",
    config: { minScore: 80 },
  },
] as const

export async function seedDefaultAutomations(workspaceId: string) {
  const scopeIds = await getWorkspaceScopeIds(workspaceId)
  for (const auto of DEFAULT_AUTOMATIONS) {
    const [existing] = await db
      .select({ id: automations.id })
      .from(automations)
      .where(
        and(
          workspaceUserIdMatches(automations.userId, scopeIds),
          eq(automations.name, auto.name),
        ),
      )
      .limit(1)
    if (existing) continue

    await db.insert(automations).values({
      id: randomId("auto"),
      userId: workspaceId,
      name: auto.name,
      trigger: auto.trigger,
      action: auto.action,
      config: auto.config,
      // Automations ship OFF by default — the workspace opts in from the
      // Automations page. Nothing auto-runs until a human turns it on.
      enabled: false,
    })
  }
}

async function findTagBySlug(workspaceId: string, scopeIds: string[], slug: string) {
  const [row] = await db
    .select()
    .from(tags)
    .where(and(workspaceUserIdMatches(tags.userId, scopeIds), eq(tags.slug, slug)))
    .limit(1)
  return row ?? null
}

async function findGroupByName(workspaceId: string, scopeIds: string[], name: string) {
  const slug = slugifyTag(name)
  const [row] = await db
    .select()
    .from(groups)
    .where(and(workspaceUserIdMatches(groups.userId, scopeIds), eq(groups.slug, slug)))
    .limit(1)
  return row ?? null
}

export async function processLeadAutomations(
  workspaceId: string,
  contactId: string,
  context: { isNew: boolean; leadScore: number; source: string },
) {
  await seedDefaultAutomations(workspaceId)
  const scopeIds = await getWorkspaceScopeIds(workspaceId)

  const rows = await db
    .select()
    .from(automations)
    .where(
      and(
        workspaceUserIdMatches(automations.userId, scopeIds),
        eq(automations.enabled, true),
        inArray(automations.trigger, ["form_submitted", "lead_scored"]),
      ),
    )

  for (const auto of rows) {
    const config = auto.config as Record<string, unknown>

    if (auto.trigger === "form_submitted" && auto.action === "new_lead_sequence" && context.isNew) {
      const tagSlug = String(config.tagSlug ?? "needs-follow-up")
      const tag = await findTagBySlug(workspaceId, scopeIds, tagSlug)
      if (tag) {
        await db
          .insert(contactTags)
          .values({ contactId, tagId: tag.id, addedBy: "automation" })
          .onConflictDoNothing()
      }

      await createCampaignDraftForWorkspace(workspaceId, {
        name: "New Lead Follow-Up (auto)",
        type: "new-lead-nurture",
        goal: "Convert new inquiry to appointment",
        audience: `Contact ${contactId}`,
      })

      await db.insert(activities).values({
        id: randomId("a"),
        userId: workspaceId,
        type: "campaign_entered",
        message: `Automation "${auto.name}" started new lead follow-up draft`,
        contactId,
        actorId: "automation",
      })
    }

    if (auto.trigger === "lead_scored" && auto.action === "high_intent_alert") {
      const minScore = Number(config.minScore ?? 80)
      if (context.leadScore >= minScore) {
        await db.insert(activities).values({
          id: randomId("a"),
          userId: workspaceId,
          type: "note_added",
          message: `High-intent lead alert (score ${context.leadScore}) from ${context.source}. Recommend immediate call.`,
          contactId,
          actorId: "automation",
        })
      }
    }
  }
}

export async function runInactiveCustomerAutomation(workspaceId: string) {
  await seedDefaultAutomations(workspaceId)
  const scopeIds = await getWorkspaceScopeIds(workspaceId)

  const [auto] = await db
    .select()
    .from(automations)
    .where(
      and(
        workspaceUserIdMatches(automations.userId, scopeIds),
        eq(automations.action, "mark_inactive_90"),
        eq(automations.enabled, true),
      ),
    )
    .limit(1)

  if (!auto) return { updated: 0 }

  const config = auto.config as Record<string, unknown>
  const days = Number(config.days ?? 90)
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

  const stale = await db
    .select()
    .from(contacts)
    .where(
      and(
        workspaceUserIdMatches(contacts.userId, scopeIds),
        inArray(contacts.lifecycleStage, ["Customer", "Repeat Customer"]),
        or(sql`${contacts.lastPurchaseAt} IS NULL`, sql`${contacts.lastPurchaseAt} < ${cutoff}`),
      ),
    )

  const tagSlug = String(config.tagSlug ?? "inactive-90")
  const groupName = String(config.groupName ?? "Inactive 90 Days")
  const tag = await findTagBySlug(workspaceId, scopeIds, tagSlug)
  const group = await findGroupByName(workspaceId, scopeIds, groupName)
  const reactivationGroup = await findGroupByName(workspaceId, scopeIds, "Reactivation List")

  let updated = 0
  for (const contact of stale) {
    await db
      .update(contacts)
      .set({
        lifecycleStage: "Inactive Customer",
        customerStatus: "Inactive",
        recommendedNextAction: "Enroll in reactivation campaign",
        lastActivityAt: new Date(),
      })
      .where(eq(contacts.id, contact.id))

    if (tag) {
      await db
        .insert(contactTags)
        .values({ contactId: contact.id, tagId: tag.id, addedBy: "automation" })
        .onConflictDoNothing()
    }
    if (group) {
      await db
        .insert(contactGroups)
        .values({ contactId: contact.id, groupId: group.id, addedBy: "automation" })
        .onConflictDoNothing()
    }
    if (reactivationGroup) {
      await db
        .insert(contactGroups)
        .values({ contactId: contact.id, groupId: reactivationGroup.id, addedBy: "automation" })
        .onConflictDoNothing()
    }
    updated++
  }

  await db
    .update(automations)
    .set({ lastRunAt: new Date() })
    .where(eq(automations.id, auto.id))

  if (updated > 0) {
    await createCampaignDraftForWorkspace(workspaceId, {
      name: `Reactivation — ${updated} inactive customers`,
      type: "reactivation",
      goal: "Bring inactive customers back",
      audience: `${updated} customers inactive ${days}+ days`,
      groupName: "Reactivation List",
    })
  }

  return { updated }
}

export async function processPurchaseAutomations(workspaceId: string, contactId: string) {
  await seedDefaultAutomations(workspaceId)
  const scopeIds = await getWorkspaceScopeIds(workspaceId)

  const [auto] = await db
    .select()
    .from(automations)
    .where(
      and(
        workspaceUserIdMatches(automations.userId, scopeIds),
        eq(automations.action, "review_request"),
        eq(automations.enabled, true),
      ),
    )
    .limit(1)

  if (!auto) return

  await createCampaignDraftForWorkspace(workspaceId, {
    name: "Review Request (auto)",
    type: "review-request",
    goal: "Collect a review from recent customer",
    audience: `Contact ${contactId}`,
  })

  await db.insert(activities).values({
    id: randomId("a"),
    userId: workspaceId,
    type: "campaign_entered",
    message: `Automation "${auto.name}" queued review request campaign draft`,
    contactId,
    actorId: "automation",
  })
}
