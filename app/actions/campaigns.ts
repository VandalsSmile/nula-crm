"use server"

import { and, desc, eq, notInArray } from "drizzle-orm"
import { revalidatePath } from "next/cache"

import { db } from "@/lib/db"
import { activities, campaignSends, campaigns, contactGroups, contacts } from "@/lib/db/schema"
import { getActingUser, workspaceUserIdMatches } from "@/lib/auth-helpers"
import { getActingWriter } from "@/lib/entitlements"
import { getWorkspaceBrand } from "@/lib/email/sender"
import { renderCampaignEmail } from "@/lib/email/template"
import { APP_ROUTES } from "@/lib/routes"
import { randomId } from "@/lib/library-helpers"
import { CAMPAIGN_TEMPLATES } from "@/lib/crm-defaults"
import { createCampaignDraftForWorkspace } from "@/lib/campaigns/drafts"
import { enrollCampaign, processDueCampaignSends } from "@/lib/campaigns/schedule"
import type { CampaignStep } from "@/lib/crm-types"

/** Create a blank draft — either a one-time email ("broadcast") or a "sequence". */
export async function createCampaign(input: {
  name?: string
  kind: "broadcast" | "sequence"
}): Promise<{ id: string }> {
  const { workspaceId } = await getActingWriter()
  const kind = input.kind === "sequence" ? "sequence" : "broadcast"
  const name = input.name?.trim() || (kind === "sequence" ? "New sequence" : "New email campaign")
  const [row] = await db
    .insert(campaigns)
    .values({
      id: randomId("cmp"),
      userId: workspaceId,
      name,
      kind,
      type: kind === "sequence" ? "sequence" : "email",
      status: "draft",
      sequence: [{ step: 1, channel: "email", subject: "", body: "", featuredImageUrl: "", delayDays: 0 }],
    })
    .returning()
  revalidatePath(APP_ROUTES.campaigns)
  return { id: row.id }
}

export type CampaignSendRow = {
  contactId: string
  name: string
  email: string
  step: number
  status: string
  scheduledFor: string | null
  sentAt: string | null
  error: string
}

export type CampaignSendHistory = {
  counts: {
    total: number
    scheduled: number
    sending: number
    sent: number
    skipped: number
    failed: number
  }
  recipients: CampaignSendRow[]
}

/** Per-campaign email send history (bulk send report). Read-only, scoped. */
export async function getCampaignSendHistory(campaignId: string): Promise<CampaignSendHistory> {
  const { scopeIds } = await getActingUser()
  const rows = await db
    .select({
      contactId: campaignSends.contactId,
      step: campaignSends.step,
      status: campaignSends.status,
      scheduledFor: campaignSends.scheduledFor,
      sentAt: campaignSends.sentAt,
      error: campaignSends.error,
      name: contacts.name,
      email: contacts.email,
    })
    .from(campaignSends)
    .innerJoin(contacts, eq(contacts.id, campaignSends.contactId))
    .where(
      and(
        eq(campaignSends.campaignId, campaignId),
        workspaceUserIdMatches(campaignSends.userId, scopeIds),
      ),
    )
    .orderBy(desc(campaignSends.scheduledFor))
    .limit(500)

  const counts = { total: rows.length, scheduled: 0, sending: 0, sent: 0, skipped: 0, failed: 0 }
  for (const r of rows) {
    if (r.status === "scheduled") counts.scheduled++
    else if (r.status === "sending") counts.sending++
    else if (r.status === "sent") counts.sent++
    else if (r.status === "skipped") counts.skipped++
    else if (r.status === "failed") counts.failed++
  }

  return {
    counts,
    recipients: rows.map((r) => ({
      contactId: r.contactId,
      name: r.name || r.email || "Unknown",
      email: r.email || "",
      step: r.step,
      status: r.status,
      scheduledFor: r.scheduledFor ? r.scheduledFor.toISOString() : null,
      sentAt: r.sentAt ? r.sentAt.toISOString() : null,
      error: r.error || "",
    })),
  }
}

/** Render a live preview of one email using the workspace's brand. Read-only. */
export async function renderCampaignPreview(input: {
  subject: string
  body: string
  featuredImageUrl?: string
}): Promise<{ html: string }> {
  const { workspaceId } = await getActingUser()
  const brand = await getWorkspaceBrand(workspaceId)
  const bodyHtml = /<[a-z][\s\S]*>/i.test(input.body)
    ? input.body
    : `<p>${(input.body || "").replace(/\n/g, "<br>")}</p>`
  const { html } = renderCampaignEmail({ brand, bodyHtml, featuredImageUrl: input.featuredImageUrl })
  return { html }
}

export async function createCampaignFromTemplate(templateId: string) {
  const { workspaceId } = await getActingWriter()
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
  kind?: "broadcast" | "sequence"
  sequence?: CampaignStep[]
}

function normalizeSequence(steps: CampaignStep[]): CampaignStep[] {
  // Email-only for now (SMS is hidden until we ship a provider). Every step is
  // coerced to email so no SMS step can be created or persisted from the UI.
  return steps
    .filter((s) => Boolean(s.subject?.trim() || s.body?.trim()))
    .map((s, index) => ({
      step: index + 1,
      channel: "email",
      subject: (s.subject ?? "").trim(),
      body: (s.body ?? "").trim(),
      featuredImageUrl: (s.featuredImageUrl ?? "").trim(),
      delayDays: index === 0 ? 0 : Math.max(0, Math.round(Number(s.delayDays ?? 0))),
    }))
}

export async function updateCampaign(campaignId: string, input: CampaignUpdateInput) {
  const { scopeIds } = await getActingWriter()
  const patch: Record<string, string | null | Date | CampaignStep[]> = { updatedAt: new Date() }
  if (input.name !== undefined) patch.name = input.name.trim()
  if (input.goal !== undefined) patch.goal = input.goal.trim()
  if (input.audience !== undefined) patch.audience = input.audience.trim()
  if (input.groupId !== undefined) patch.groupId = input.groupId
  if (input.status !== undefined) patch.status = input.status
  if (input.kind !== undefined) patch.kind = input.kind === "sequence" ? "sequence" : "broadcast"
  if (input.sequence !== undefined) {
    let seq = normalizeSequence(input.sequence)
    // A broadcast is exactly one email; keep only the first step.
    if (patch.kind === "broadcast") seq = seq.slice(0, 1)
    patch.sequence = seq
  }

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
  const { scopeIds } = await getActingWriter()
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
  const { scopeIds } = await getActingWriter()
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
  const { user, workspaceId, scopeIds } = await getActingWriter()
  const [campaign] = await db
    .select()
    .from(campaigns)
    .where(and(eq(campaigns.id, campaignId), workspaceUserIdMatches(campaigns.userId, scopeIds)))
    .limit(1)
  if (!campaign) throw new Error("Campaign not found")
  if (campaign.status === "active" || campaign.status === "completed") {
    throw new Error("Campaign already launched")
  }

  // Atomically claim the launch: only the caller that flips the status away from
  // its current value proceeds. This stops two concurrent launches (e.g. a
  // double-click) from both enrolling the audience and double-sending.
  const [claimed] = await db
    .update(campaigns)
    .set({ status: "active", updatedAt: new Date() })
    .where(and(eq(campaigns.id, campaignId), notInArray(campaigns.status, ["active", "completed"])))
    .returning({ id: campaigns.id })
  if (!claimed) throw new Error("Campaign already launched")

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
  if (!launched) {
    // Nothing to send yet — release the claim back to "scheduled" so it can be
    // launched again once the audience has contacts.
    await db
      .update(campaigns)
      .set({ status: "scheduled", updatedAt: new Date() })
      .where(eq(campaigns.id, campaignId))
  }

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
        processed.pending > 0
          ? " Connect Resend in Settings → Email to deliver these email steps."
          : ""
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
