import "server-only"

import { and, eq, lte } from "drizzle-orm"

import { db } from "@/lib/db"
import { campaignSends, campaigns, contacts } from "@/lib/db/schema"
import { randomId } from "@/lib/library-helpers"

type CampaignRow = typeof campaigns.$inferSelect
type ContactRow = typeof contacts.$inferSelect

export type SequenceStep = {
  step: number
  channel: string
  subject?: string
  body?: string
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

async function sendEmailStep(params: {
  to: string
  subject: string
  body: string
}): Promise<{ ok: boolean; error?: string }> {
  const resendKey = process.env.RESEND_API_KEY?.trim()
  const from = process.env.RESEND_FROM_EMAIL?.trim() || "Nula CRM <info@nulacrm.ai>"
  if (!resendKey) return { ok: false, error: "no_api_key" }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to: params.to,
        subject: params.subject,
        html: `<p>${params.body.replace(/\n/g, "<br>")}</p>`,
        text: params.body,
      }),
    })
    if (!response.ok) {
      const detail = await response.text().catch(() => "")
      return { ok: false, error: `resend_${response.status}:${detail.slice(0, 200)}` }
    }
    return { ok: true }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "send_failed" }
  }
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

  const hasResendKey = Boolean(process.env.RESEND_API_KEY?.trim())
  let sent = 0
  let skipped = 0
  let failed = 0
  let pending = 0

  for (const { send, campaign, contact } of dueRows) {
    const step = campaignSequence(campaign).find((s) => s.step === send.step)

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

    if (!hasResendKey) {
      // Leave scheduled so it retries once RESEND_API_KEY is configured.
      pending++
      continue
    }

    const result = await sendEmailStep({
      to: contact.email,
      subject: step?.subject || campaign.name,
      body: step?.body || "",
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
