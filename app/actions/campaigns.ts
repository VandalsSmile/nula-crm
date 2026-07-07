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
import { sendCampaignMessages } from "@/lib/campaigns/send"

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

  const sendResult = await sendCampaignMessages(campaign, audienceContacts)

  await db
    .update(campaigns)
    .set({ status: sendResult.sent ? "active" : "scheduled", updatedAt: new Date() })
    .where(eq(campaigns.id, campaignId))

  for (const contactId of sendResult.contactIds.slice(0, 50)) {
    await db.insert(activities).values({
      id: randomId("a"),
      userId: workspaceId,
      type: "campaign_entered",
      message: `Entered campaign "${campaign.name}"`,
      contactId,
      actorId: user.id,
    })
  }

  revalidatePath(APP_ROUTES.campaigns)
  return {
    ok: true,
    sent: sendResult.sent,
    recipientCount: sendResult.contactIds.length,
    message: sendResult.message,
  }
}
