"use server"

import { eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"

import { requireRole } from "@/lib/auth-helpers"
import { db } from "@/lib/db"
import { workspaceSettings } from "@/lib/db/schema"
import { getWorkspaceEmailConfig, sendEmailViaResend } from "@/lib/email/sender"
import { APP_ROUTES } from "@/lib/routes"

export type EmailSettingsInfo = {
  fromName: string
  fromEmail: string
  /** Whether the workspace has its own Resend key saved (never returns the key). */
  hasApiKey: boolean
  /** true when the workspace's own Resend account will be used for sends. */
  usingWorkspace: boolean
  /** true when the platform has a fallback Resend key configured. */
  platformConfigured: boolean
}

/** Read the workspace's email-sending settings. Admin-only. Never returns the key. */
export async function getEmailSettings(): Promise<EmailSettingsInfo> {
  const { workspaceId } = await requireRole("Admin")
  const [row] = await db
    .select({
      apiKey: workspaceSettings.resendApiKey,
      fromEmail: workspaceSettings.resendFromEmail,
      fromName: workspaceSettings.resendFromName,
    })
    .from(workspaceSettings)
    .where(eq(workspaceSettings.workspaceId, workspaceId))
    .limit(1)

  const hasApiKey = Boolean(row?.apiKey?.trim())
  return {
    fromName: row?.fromName ?? "",
    fromEmail: row?.fromEmail ?? "",
    hasApiKey,
    usingWorkspace: hasApiKey && Boolean(row?.fromEmail?.trim()),
    platformConfigured: Boolean(process.env.RESEND_API_KEY?.trim()),
  }
}

/**
 * Update the workspace's email settings. Admin-only. `apiKey` is only written
 * when a non-empty value is supplied (so saving From fields doesn't wipe the
 * saved key); pass `clearApiKey` to disconnect.
 */
export async function updateEmailSettings(input: {
  apiKey?: string
  fromName?: string
  fromEmail?: string
  clearApiKey?: boolean
}): Promise<EmailSettingsInfo> {
  const { workspaceId } = await requireRole("Admin")

  const set: Partial<typeof workspaceSettings.$inferInsert> = { updatedAt: new Date() }
  if (input.clearApiKey) set.resendApiKey = ""
  else if (input.apiKey?.trim()) set.resendApiKey = input.apiKey.trim()
  if (input.fromName !== undefined) set.resendFromName = input.fromName.trim()
  if (input.fromEmail !== undefined) set.resendFromEmail = input.fromEmail.trim()

  await db
    .insert(workspaceSettings)
    .values({ workspaceId, ...set })
    .onConflictDoUpdate({ target: workspaceSettings.workspaceId, set })

  revalidatePath(APP_ROUTES.settings)
  return getEmailSettings()
}

/** Send a test email using the workspace's (or platform's) Resend config. Admin-only. */
export async function sendTestEmail(
  to: string,
): Promise<{ ok: boolean; error?: string; from: string; usingWorkspace: boolean }> {
  const { workspaceId } = await requireRole("Admin")
  const target = to.trim()
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(target)) {
    throw new Error("Enter a valid email address")
  }

  const config = await getWorkspaceEmailConfig(workspaceId)
  if (!config.apiKey) {
    return {
      ok: false,
      error: "No Resend API key is configured yet. Add your key above and save first.",
      from: config.from,
      usingWorkspace: config.usingWorkspace,
    }
  }

  const result = await sendEmailViaResend(config, {
    to: target,
    subject: "Your Nula test email",
    html: `<p>This is a test email from Nula CRM.</p><p>If you received this, your email sending is configured correctly and campaigns will send from <strong>${config.from}</strong>.</p>`,
    text: `This is a test email from Nula CRM. If you received this, your email sending is configured correctly and campaigns will send from ${config.from}.`,
  })

  return { ...result, from: config.from, usingWorkspace: config.usingWorkspace }
}
