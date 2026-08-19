import "server-only"

import { and, eq, lte } from "drizzle-orm"

import { db } from "@/lib/db"
import { campaignSends, campaigns, contacts } from "@/lib/db/schema"
import {
  getWorkspaceBrand,
  getWorkspaceEmailConfig,
  sendEmailViaResend,
  type EmailBrand,
  type EmailConfig,
} from "@/lib/email/sender"
import { renderCampaignEmail } from "@/lib/email/template"
import { randomId } from "@/lib/library-helpers"
import { ensureUnsubscribeToken, unsubscribeUrl } from "@/lib/unsubscribe"

type CampaignRow = typeof campaigns.$inferSelect
type ContactRow = typeof contacts.$inferSelect

export type SequenceStep = {
  step: number
  channel: string
  subject?: string
  body?: string
  featuredImageUrl?: string
  delayDays?: number
}

const DAY_MS = 24 * 60 * 60 * 1000

export function campaignSequence(campaign: Pick<CampaignRow, "sequence">): SequenceStep[] {
  return (campaign.sequence ?? []) as SequenceStep[]
}

/**
 * Schedules every step of a campaign's sequence for each recipient. Step delays
 * (`delayDays`) are anchored to `from` (defaults to now). Idempotent per
 * (campaign, contact, step).
 */
export async function enrollCampaign(
  campaign: CampaignRow,
  recipients: ContactRow[],
  from: Date = new Date(),
) {
  const sequence = campaignSequence(campaign)
  if (sequence.length === 0 || recipients.length === 0) {
    return { recipients: recipients.length, scheduled: 0 }
  }

  let scheduled = 0
  for (const contact of recipients) {
    for (const step of sequence) {
      const scheduledFor = new Date(from.getTime() + (step.delayDays ?? 0) * DAY_MS)
      const inserted = await db
        .insert(campaignSends)
        .values({
          id: randomId("cs"),
          userId: campaign.userId,
          campaignId: campaign.id,
          contactId: contact.id,
          step: step.step,
          channel: step.channel || "email",
          status: "scheduled",
          scheduledFor,
        })
        .onConflictDoNothing()
        .returning()
      if (inserted.length > 0) scheduled++
    }
  }

  return { recipients: recipients.length, scheduled }
}

async function sendEmailStep(
  config: EmailConfig,
  brand: EmailBrand,
  params: {
    to: string
    subject: string
    body: string
    featuredImageUrl?: string
    unsubscribeUrl?: string
  },
): Promise<{ ok: boolean; error?: string }> {
  // Bodies authored before the rich editor are plain text; wrap those in a
  // paragraph. Rich HTML bodies (contain a tag) are rendered as-is (sanitized
  // inside the template).
  const bodyHtml = /<[a-z][\s\S]*>/i.test(params.body)
    ? params.body
    : `<p>${params.body.replace(/\n/g, "<br>")}</p>`
  const rendered = renderCampaignEmail({
    brand,
    bodyHtml,
    featuredImageUrl: params.featuredImageUrl,
    unsubscribeUrl: params.unsubscribeUrl,
  })
  return sendEmailViaResend(config, {
    to: params.to,
    subject: params.subject,
    html: rendered.html,
    text: rendered.text,
    // List-Unsubscribe improves deliverability and enables inbox "unsubscribe".
    headers: params.unsubscribeUrl
      ? { "List-Unsubscribe": `<${params.unsubscribeUrl}>` }
      : undefined,
  })
}

/**
 * Processes campaign sends whose scheduled time has arrived. Email steps are
 * sent via Resend; SMS steps are skipped (no provider configured). Steps that
 * can't send because Resend isn't configured stay scheduled to retry later.
 */
export async function processDueCampaignSends(
  workspaceId: string,
  opts?: { campaignId?: string; now?: Date; limit?: number },
) {
  const now = opts?.now ?? new Date()
  const limit = opts?.limit ?? 200

  const conditions = [
    eq(campaignSends.userId, workspaceId),
    eq(campaignSends.status, "scheduled"),
    lte(campaignSends.scheduledFor, now),
  ]
  if (opts?.campaignId) conditions.push(eq(campaignSends.campaignId, opts.campaignId))

  const dueRows = await db
    .select({
      send: campaignSends,
      campaign: campaigns,
      contact: contacts,
    })
    .from(campaignSends)
    .innerJoin(campaigns, eq(campaigns.id, campaignSends.campaignId))
    .innerJoin(contacts, eq(contacts.id, campaignSends.contactId))
    .where(and(...conditions))
    .limit(limit)

  const emailConfig = await getWorkspaceEmailConfig(workspaceId)
  const brand = await getWorkspaceBrand(workspaceId)
  const hasResendKey = Boolean(emailConfig.apiKey)
  let sent = 0
  let skipped = 0
  let failed = 0
  let pending = 0

  for (const { send, campaign, contact } of dueRows) {
    const step = campaignSequence(campaign).find((s) => s.step === send.step)

    if (send.channel === "email" && contact.email && !hasResendKey) {
      // Leave scheduled so it retries once RESEND_API_KEY is configured — don't
      // claim it, so a later run can pick it up.
      pending++
      continue
    }

    // Atomically claim this send (scheduled → sending) so a concurrent run — e.g.
    // the campaigns cron overlapping a manual launch — can't process/send the
    // same row twice. Only the worker that flips the status proceeds.
    const [claimed] = await db
      .update(campaignSends)
      .set({ status: "sending" })
      .where(and(eq(campaignSends.id, send.id), eq(campaignSends.status, "scheduled")))
      .returning({ id: campaignSends.id })
    if (!claimed) continue

    if (send.channel !== "email") {
      // No SMS provider configured yet — skip so the sequence can continue.
      await db
        .update(campaignSends)
        .set({ status: "skipped", sentAt: now, error: "no_sms_provider" })
        .where(eq(campaignSends.id, send.id))
      skipped++
      continue
    }

    if (!contact.email) {
      await db
        .update(campaignSends)
        .set({ status: "skipped", sentAt: now, error: "no_email_address" })
        .where(eq(campaignSends.id, send.id))
      skipped++
      continue
    }

    const unsubToken = await ensureUnsubscribeToken(contact.id, contact.unsubscribeToken)
    const result = await sendEmailStep(emailConfig, brand, {
      to: contact.email,
      subject: step?.subject || campaign.name,
      body: step?.body || "",
      featuredImageUrl: step?.featuredImageUrl,
      unsubscribeUrl: unsubscribeUrl(unsubToken),
    })

    if (result.ok) {
      await db
        .update(campaignSends)
        .set({ status: "sent", sentAt: now, error: "" })
        .where(eq(campaignSends.id, send.id))
      sent++
    } else {
      await db
        .update(campaignSends)
        .set({ status: "failed", error: result.error ?? "send_failed" })
        .where(eq(campaignSends.id, send.id))
      failed++
    }
  }

  return { due: dueRows.length, sent, skipped, failed, pending }
}
