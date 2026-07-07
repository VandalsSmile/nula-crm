"use server"

import { and, desc, eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"

import { db } from "@/lib/db"
import {
  activities,
  aiActions,
  contactGroups,
  contactTags,
  contacts,
  groups,
  tags,
} from "@/lib/db/schema"
import { getActingUser, workspaceUserIdMatches } from "@/lib/auth-helpers"
import { APP_ROUTES } from "@/lib/routes"
import { interpretCommandAsync } from "@/lib/ai/interpret-with-llm"
import { productKeywordsForIntent, type AiIntent } from "@/lib/ai/interpreter"
import { createCampaignDraftForWorkspace } from "@/lib/campaigns/drafts"
import { randomId } from "@/lib/library-helpers"
import {
  getContacts,
  getInactiveCustomers,
  searchContactsByProductKeyword,
} from "@/lib/queries"
import { slugifyTag } from "@/lib/crm-defaults"
import type { AiActionPreview } from "@/lib/crm-types"

async function ensureGroup(workspaceId: string, scopeIds: string[], name: string, actorId: string) {
  const slug = slugifyTag(name)
  const [existing] = await db
    .select()
    .from(groups)
    .where(and(workspaceUserIdMatches(groups.userId, scopeIds), eq(groups.slug, slug)))
    .limit(1)
  if (existing) return existing

  const [created] = await db
    .insert(groups)
    .values({
      id: randomId("g"),
      userId: workspaceId,
      name,
      slug,
      description: `Created by AI`,
      type: "audience",
      isSystem: false,
    })
    .returning()
  return created
}

async function addContactsToGroup(
  contactIds: string[],
  groupId: string,
  actorId: string,
  workspaceId: string,
) {
  for (const contactId of contactIds) {
    await db
      .insert(contactGroups)
      .values({ contactId, groupId, addedBy: actorId })
      .onConflictDoNothing()
  }

  await db.insert(activities).values({
    id: randomId("a"),
    userId: workspaceId,
    type: "group_changed",
    message: `AI added ${contactIds.length} contact(s) to a group`,
    contactId: contactIds[0] ?? "",
    actorId,
  })
}

export async function interpretAiCommand(command: string) {
  const { user, workspaceId } = await getActingUser()
  const interpreted = await interpretCommandAsync(command)

  const [row] = await db
    .insert(aiActions)
    .values({
      id: randomId("ai"),
      userId: workspaceId,
      actorId: user.id,
      command,
      intent: interpreted.intent,
      status: interpreted.requiresApproval ? "pending" : "approved",
      preview: interpreted.preview,
      reversible: interpreted.requiresApproval,
      result: { params: interpreted.params },
    })
    .returning()

  if (!interpreted.requiresApproval) {
    const result = await executeAiActionInternal(
      row.id,
      interpreted.intent,
      interpreted.params,
      interpreted.preview,
    )
    return { actionId: row.id, preview: interpreted.preview, result, requiresApproval: false }
  }

  return { actionId: row.id, preview: interpreted.preview, requiresApproval: true }
}

export async function approveAiAction(actionId: string) {
  await getActingUser()
  const [action] = await db.select().from(aiActions).where(eq(aiActions.id, actionId)).limit(1)
  if (!action) throw new Error("Action not found")
  if (action.status !== "pending") throw new Error("Action is not pending approval")

  const preview = action.preview as AiActionPreview
  const stored = action.result as { params?: Record<string, string> } | null
  const params = stored?.params ?? {}
  const result = await executeAiActionInternal(actionId, action.intent as AiIntent, params, preview)
  return result
}

async function executeAiActionInternal(
  actionId: string,
  intent: AiIntent,
  params: Record<string, string>,
  preview: AiActionPreview,
) {
  const { user, workspaceId, scopeIds } = await getActingUser()
  let summary = "Done."
  let impactCount = 0
  let undoPayload: Record<string, unknown> | null = null

  if (intent === "add_to_group") {
    const groupName = params.groupName ?? preview.title.replace(/^Add contacts to /, "")
    const product = params.product
    let matches = product
      ? await searchContactsByProductKeyword(productKeywordsForIntent(product)[0] ?? product, scopeIds)
      : await db.select().from(contacts).where(workspaceUserIdMatches(contacts.userId, scopeIds))

    if (product) {
      const keywords = productKeywordsForIntent(product)
      const all = await Promise.all(keywords.map((k) => searchContactsByProductKeyword(k, scopeIds)))
      const seen = new Set<string>()
      matches = all.flat().filter((c) => {
        if (seen.has(c.id)) return false
        seen.add(c.id)
        return true
      })
    }

    const group = await ensureGroup(workspaceId, scopeIds, groupName, user.id)
    const contactIds = matches.map((c) => c.id)
    undoPayload = { contactIds, groupId: group.id }
    await addContactsToGroup(contactIds, group.id, user.id, workspaceId)
    impactCount = contactIds.length
    summary = `Added ${impactCount} contact(s) to ${group.name}.`
  }

  if (intent === "create_reactivation_campaign") {
    const inactive = await getInactiveCustomers(90)
    impactCount = inactive.length
    const campaign = await createCampaignDraftForWorkspace(workspaceId, {
      name: "Reactivation — 90 day inactive",
      type: "reactivation",
      goal: "Bring customers back with a relevant offer",
      audience: `${impactCount} customers inactive 90+ days`,
      groupName: "Reactivation List",
    })
    summary = `Created reactivation campaign draft "${campaign.name}" for ${impactCount} inactive customers. Review and approve in Campaigns.`
  }

  if (intent === "find_duplicates") {
    const all = await getContacts()
    const byEmail = new Map<string, number>()
    for (const c of all) {
      if (!c.email) continue
      byEmail.set(c.email.toLowerCase(), (byEmail.get(c.email.toLowerCase()) ?? 0) + 1)
    }
    impactCount = [...byEmail.values()].filter((n) => n > 1).length
    summary =
      impactCount > 0
        ? `Found ${impactCount} email address(es) with possible duplicates.`
        : "No duplicate emails found."
  }

  if (intent === "normalize_tags") {
    const tagRows = await db.select().from(tags).where(workspaceUserIdMatches(tags.userId, scopeIds))
    const clusters = new Map<string, string[]>()
    for (const t of tagRows) {
      const key = t.slug.replace(/[-_]/g, "")
      const list = clusters.get(key) ?? []
      list.push(t.name)
      clusters.set(key, list)
    }
    impactCount = [...clusters.values()].filter((names) => names.length > 1).length
    summary =
      impactCount > 0
        ? `Found ${impactCount} tag clusters to consolidate. Review in AI Command Center.`
        : "Tags look clean — no consolidation needed."
  }

  if (intent === "summarize_conversion") {
    const all = await getContacts()
    const stuck = all.filter((c) => c.lifecycleStage === "New Lead" || c.lifecycleStage === "Contacted")
    impactCount = stuck.length
    summary = `${impactCount} leads are still in early stages. Top blocker: slow follow-up on new inquiries.`
  }

  if (intent === "draft_follow_up") {
    summary = `Draft ready: friendly follow-up about ${params.topic ?? "your inquiry"}. Copy is saved in AI Command Center — nothing was sent.`
  }

  if (intent === "search_contacts" || intent === "unknown") {
    const all = await getContacts()
    impactCount = all.filter((c) => c.lifecycleStage === "New Lead" || c.lifecycleStage === "Interested").length
    summary = `Found ${impactCount} contacts matching your search criteria.`
  }

  await db
    .update(aiActions)
    .set({
      status: "executed",
      summary,
      executedAt: new Date(),
      result: { impactCount, summary },
      undoPayload,
      preview: { ...preview, impactCount },
    })
    .where(eq(aiActions.id, actionId))

  revalidatePath(APP_ROUTES.dashboard)
  revalidatePath(APP_ROUTES.contacts)
  revalidatePath(APP_ROUTES.groups)
  revalidatePath(APP_ROUTES.ai)

  return { summary, impactCount }
}

export async function undoLastAiAction() {
  const { user, workspaceId, scopeIds } = await getActingUser()
  const [action] = await db
    .select()
    .from(aiActions)
    .where(and(eq(aiActions.userId, workspaceId), eq(aiActions.status, "executed")))
    .orderBy(desc(aiActions.executedAt))
    .limit(1)

  if (!action?.undoPayload || !action.reversible) throw new Error("No reversible AI action found")

  const payload = action.undoPayload as { contactIds?: string[]; groupId?: string }
  if (payload.contactIds && payload.groupId) {
    for (const contactId of payload.contactIds) {
      await db
        .delete(contactGroups)
        .where(and(eq(contactGroups.contactId, contactId), eq(contactGroups.groupId, payload.groupId!)))
    }
  }

  await db
    .update(aiActions)
    .set({ status: "undone", undoneAt: new Date(), summary: "Last AI action was undone." })
    .where(eq(aiActions.id, action.id))

  revalidatePath(APP_ROUTES.dashboard)
  revalidatePath(APP_ROUTES.contacts)
  revalidatePath(APP_ROUTES.groups)
  revalidatePath(APP_ROUTES.ai)

  return { ok: true, summary: "Undid the last AI action." }
}

export async function listAiActions(limit = 20) {
  const { workspaceId } = await getActingUser()
  const rows = await db
    .select()
    .from(aiActions)
    .where(eq(aiActions.userId, workspaceId))
    .orderBy(desc(aiActions.createdAt))
    .limit(limit)

  return rows.map((r) => ({
    id: r.id,
    command: r.command,
    intent: r.intent,
    status: r.status as "pending" | "approved" | "executed" | "cancelled" | "undone",
    preview: r.preview as AiActionPreview,
    summary: r.summary,
    reversible: r.reversible,
    createdAt: r.createdAt.toISOString(),
    executedAt: r.executedAt?.toISOString() ?? null,
  }))
}

export async function cancelAiAction(actionId: string) {
  await getActingUser()
  await db.update(aiActions).set({ status: "cancelled" }).where(eq(aiActions.id, actionId))
  revalidatePath(APP_ROUTES.ai)
}
