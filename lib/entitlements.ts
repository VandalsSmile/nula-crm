import "server-only"

import { eq } from "drizzle-orm"

import { getActingUser, getWorkspaceId } from "@/lib/auth-helpers"
import { db } from "@/lib/db"
import { workspaceSettings } from "@/lib/db/schema"
import { isEntitled, TRIAL_ENDED_MESSAGE } from "@/lib/trial"

// Re-exported for existing importers; the source of truth is the pure trial module.
export { TRIAL_ENDED_MESSAGE }

/**
 * Whether the workspace currently has write access — paid, comped, or an
 * unexpired trial. A workspace with no settings row is a brand-new account
 * (pre-onboarding) and is treated as trialing (entitled).
 */
export async function isWorkspaceEntitled(workspaceId: string): Promise<boolean> {
  const [row] = await db
    .select({ plan: workspaceSettings.plan, trialEndsAt: workspaceSettings.trialEndsAt })
    .from(workspaceSettings)
    .where(eq(workspaceSettings.workspaceId, workspaceId))
    .limit(1)
  if (!row) return true
  return isEntitled(row.plan, row.trialEndsAt)
}

/**
 * Guard for MUTATING server actions: throws when the workspace's trial has
 * ended and it isn't on a paid/comped plan. Reads stay allowed; only write
 * actions should call this. Billing/account/settings actions intentionally do
 * NOT call it, so a locked-out workspace can still upgrade and manage its account.
 */
export async function requireActiveWorkspace(workspaceId?: string): Promise<void> {
  const ws = workspaceId ?? (await getWorkspaceId())
  if (!(await isWorkspaceEntitled(ws))) {
    throw new Error(TRIAL_ENDED_MESSAGE)
  }
}

/**
 * Drop-in replacement for `getActingUser()` in MUTATING server actions: resolves
 * the acting user/workspace/role AND enforces an active plan (throws when the
 * trial has ended and there's no paid/comp plan). Returns the same shape as
 * `getActingUser()`, so call sites don't change beyond the function name.
 */
export async function getActingWriter() {
  const acting = await getActingUser()
  await requireActiveWorkspace(acting.workspaceId)
  return acting
}
