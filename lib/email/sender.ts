import "server-only"

import { eq } from "drizzle-orm"

import { db } from "@/lib/db"
import { workspaceSettings } from "@/lib/db/schema"

export type EmailConfig = {
  /** Resend API key to send with (workspace's own, or the platform fallback). */
  apiKey: string
  /** RFC "Name <email>" or bare address used as the From header. */
  from: string
  /** true when the workspace has connected its own Resend account. */
  usingWorkspace: boolean
}

export type EmailBrand = {
  companyName: string
  logoUrl: string
  supportEmail: string
  address: string
  website: string
}

/** Company branding used in the campaign email header/footer. */
export async function getWorkspaceBrand(workspaceId: string): Promise<EmailBrand> {
  const [row] = await db
    .select({
      companyName: workspaceSettings.companyName,
      logoUrl: workspaceSettings.logoUrl,
      supportEmail: workspaceSettings.supportEmail,
      address: workspaceSettings.address,
      website: workspaceSettings.website,
    })
    .from(workspaceSettings)
    .where(eq(workspaceSettings.workspaceId, workspaceId))
    .limit(1)
  return {
    companyName: row?.companyName ?? "",
    logoUrl: row?.logoUrl ?? "",
    supportEmail: row?.supportEmail ?? "",
    address: row?.address ?? "",
    website: row?.website ?? "",
  }
}

const PLATFORM_FROM = "Nula CRM <info@nulacrm.ai>"

/**
 * Resolve the email-sending config for a workspace's CAMPAIGN emails. Prefers
 * the workspace's own Resend key + verified From address; otherwise falls back
 * to the platform's RESEND_* env vars so existing behavior keeps working.
 */
export async function getWorkspaceEmailConfig(workspaceId: string): Promise<EmailConfig> {
  const [row] = await db
    .select({
      apiKey: workspaceSettings.resendApiKey,
      fromEmail: workspaceSettings.resendFromEmail,
      fromName: workspaceSettings.resendFromName,
    })
    .from(workspaceSettings)
    .where(eq(workspaceSettings.workspaceId, workspaceId))
    .limit(1)

  const wsKey = row?.apiKey?.trim() ?? ""
  const wsFromEmail = row?.fromEmail?.trim() ?? ""
  const wsFromName = row?.fromName?.trim() ?? ""

  if (wsKey && wsFromEmail) {
    const from = wsFromName ? `${wsFromName} <${wsFromEmail}>` : wsFromEmail
    return { apiKey: wsKey, from, usingWorkspace: true }
  }

  const envKey = process.env.RESEND_API_KEY?.trim() ?? ""
  const envFrom = process.env.RESEND_FROM_EMAIL?.trim() || PLATFORM_FROM
  return { apiKey: envKey, from: envFrom, usingWorkspace: false }
}

/** Low-level Resend send used by campaigns and the "send test email" action. */
export async function sendEmailViaResend(
  config: EmailConfig,
  params: { to: string; subject: string; html: string; text?: string; replyTo?: string },
): Promise<{ ok: boolean; error?: string }> {
  if (!config.apiKey) return { ok: false, error: "no_api_key" }
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: config.from,
        to: params.to,
        subject: params.subject,
        html: params.html,
        text: params.text ?? "",
        ...(params.replyTo ? { reply_to: params.replyTo } : {}),
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
