"use server"

import { and, eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"

import { db } from "@/lib/db"
import { activities, campaigns, contactGroups, contacts } from "@/lib/db/schema"
import { getActingUser, workspaceUserIdMatches } from "@/lib/auth-helpers"
import { APP_ROUTES } from "@/lib/routes"
import { randomId } from "@/lib/library-helpers"
import { CAMPAIGN_TEMPLATES } from "@/lib/crm-defaults"
import { createCampaignDraftForWorkspace } from "@/lib/campaigns/drafts"
import { enrollCampaign, processDueCampaignSends } from "@/lib/campaigns/schedule"
import type { CampaignStep } from "@/lib/crm-types"

export async function createCampaignFromTemplate(templateId: string) {
  const { workspaceId } = await getActingUser()
  const template = CAMPAIGN_TEMPLATES.find((t) => t.id === templateId)
  if (!template) throw new Error("Template not found")

  const row = await createCampaignDraftForWorkspace(workspaceId, {
    name: template.name,
    type: template.type,
    goal: template.goal,
    audience: template.description,
  })

  revalidatePath(APP_ROUTES.campaigns)
  return { id: row.id, name: row.name }
}

export type CampaignUpdateInput = {
  name?: string
  goal?: string
  audience?: string
  groupId?: string | null
  status?: string
  sequence?: CampaignStep[]
}

function normalizeSequence(steps: CampaignStep[]): CampaignStep[] {
  return steps
    .filter((s) => (s.channel === "email" ? Boolean(s.subject?.trim() || s.body?.trim()) : Boolean(s.body?.trim())))
    .map((s, index) => ({
      step: index + 1,
      channel: s.channel === "sms" ? "sms" : "email",
      subject: s.channel === "sms" ? "" : (s.subject ?? "").trim(),
      body: (s.body ?? "").trim(),
      delayDays: Math.max(0, Math.round(Number(s.delayDays ?? 0))),
    }))
}

export async function updateCampaign(campaignId: string, input: CampaignUpdateInput) {
  const { scopeIds } = await getActingUser()
  const patch: Record<string, string | null | Date | CampaignStep[]> = { updatedAt: new Date() }
  if (input.name !== undefined) patch.name = input.name.trim()
  if (input.goal !== undefined) patch.goal = input.goal.trim()
  if (input.audience !== undefined) patch.audience = input.audience.trim()
  if (input.groupId !== undefined) patch.groupId = input.groupId
  if (input.status !== undefined) patch.status = input.status
  if (input.sequence !== undefined) patch.sequence = normalizeSequence(input.sequence)

  const [row] = await db
    .update(campaigns)
    .set(patch)
    .where(and(eq(campaigns.id, campaignId), workspaceUserIdMatches(campaigns.userId, scopeIds)))
    .returning()
  if (!row) throw new Error("Campaign not found")

  revalidatePath(APP_ROUTES.campaigns)
  return row
}

export async function deleteCampaign(campaignId: string) {
  const { scopeIds } = await getActingUser()
  const [row] = await db
    .select()
    .from(campaigns)
    .where(and(eq(campaigns.id, campaignId), workspaceUserIdMatches(campaigns.userId, scopeIds)))
    .limit(1)
  if (!row) throw new Error("Campaign not found")
  if (row.status === "active") throw new Error("Cannot delete an active campaign")

  await db.delete(campaigns).where(eq(campaigns.id, campaignId))
  revalidatePath(APP_ROUTES.campaigns)
  return { ok: true }
}

export async function approveCampaign(campaignId: string) {
  const { scopeIds } = await getActingUser()
  const [row] = await db
    .update(campaigns)
    .set({ status: "pending_approval", updatedAt: new Date() })
    .where(and(eq(campaigns.id, campaignId), workspaceUserIdMatches(campaigns.userId, scopeIds)))
    .returning()
  if (!row) throw new Error("Campaign not found")
  revalidatePath(APP_ROUTES.campaigns)
  return { ok: true, status: row.status }
}

export async function launchCampaign(campaignId: string) {
  const { user, workspaceId, scopeIds } = await getActingUser()
  const [campaign] = await db
    .select()
    .from(campaigns)
    .where(and(eq(campaigns.id, campaignId), workspaceUserIdMatches(campaigns.userId, scopeIds)))
    .limit(1)
  if (!campaign) throw new Error("Campaign not found")
  if (campaign.status === "active" || campaign.status === "completed") {
    throw new Error("Campaign already launched")
  }

  let audienceContacts: (typeof contacts.$inferSelect)[] = []
  if (campaign.groupId) {
    const rows = await db
      .select({ contact: contacts })
      .from(contactGroups)
      .innerJoin(contacts, eq(contacts.id, contactGroups.contactId))
      .where(
        and(
          eq(contactGroups.groupId, campaign.groupId),
          workspaceUserIdMatches(contacts.userId, scopeIds),
        ),
      )
    audienceContacts = rows.map((r) => r.contact).filter((c) => c.optInStatus !== "opted_out")
  }

  const eligible = audienceContacts.filter((c) => c.optInStatus !== "opted_out")

  // Schedule every step of the sequence for each recipient, then send the steps
  // that are due immediately (delayDays: 0). Later steps are delivered by the
  // campaigns cron.
  const enrollment = await enrollCampaign(campaign, eligible)
  const processed = await processDueCampaignSends(workspaceId, { campaignId })

  const launched = enrollment.recipients > 0
  await db
    .update(campaigns)
    .set({ status: launched ? "active" : "scheduled", updatedAt: new Date() })
    .where(eq(campaigns.id, campaignId))

  for (const contact of eligible.slice(0, 50)) {
    await db.insert(activities).values({
      id: randomId("a"),
      userId: workspaceId,
      type: "campaign_entered",
      message: `Entered campaign "${campaign.name}"`,
      contactId: contact.id,
      actorId: user.id,
    })
  }

  const remaining = Math.max(0, enrollment.scheduled - processed.sent)
  const message = launched
    ? `Enrolled ${enrollment.recipients} recipient(s). Sent ${processed.sent} now; ${remaining} step(s) scheduled for later.${
        processed.pending > 0 ? " Add RESEND_API_KEY to deliver email steps." : ""
      }`
    : "No eligible recipients in the selected audience. Add contacts to the group and launch again."

  revalidatePath(APP_ROUTES.campaigns)
  return {
    ok: true,
    sent: processed.sent > 0,
    recipientCount: enrollment.recipients,
    message,
  }
}
