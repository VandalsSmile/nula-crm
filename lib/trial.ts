/** Length of the free trial for new workspaces. */
export const TRIAL_DAYS = 7

/**
 * Message shown when a workspace tries to make changes without an active plan.
 * Lives here (a pure, client-safe module) so both server guards and client UI
 * can show the same text — important because Next.js redacts thrown server-action
 * error messages in production, so the client must supply this itself.
 */
export const TRIAL_ENDED_MESSAGE =
  "Your Nula trial has ended. Upgrade in Settings → Plan to keep making changes."

/** The moment a trial started `from` should end. */
export function trialEndDate(from: Date = new Date()): Date {
  return new Date(from.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000)
}

export type WorkspacePlan = "trial" | "active"

export type TrialStatus = {
  plan: string
  trialEndsAt: string | null
  daysLeft: number
  isTrialing: boolean
  isExpired: boolean
}

/**
 * Derive a workspace's trial state from its stored plan + trial end date.
 * A missing end date is treated as a full fresh trial (fail-open) so nobody is
 * accidentally locked out.
 */
export function computeTrialStatus(plan: string, trialEndsAt: Date | null): TrialStatus {
  const iso = trialEndsAt ? trialEndsAt.toISOString() : null

  if (plan !== "trial") {
    return { plan, trialEndsAt: iso, daysLeft: 0, isTrialing: false, isExpired: false }
  }
  if (!trialEndsAt) {
    return { plan, trialEndsAt: null, daysLeft: TRIAL_DAYS, isTrialing: true, isExpired: false }
  }

  const ms = trialEndsAt.getTime() - Date.now()
  const daysLeft = Math.max(0, Math.ceil(ms / (24 * 60 * 60 * 1000)))
  return { plan, trialEndsAt: iso, daysLeft, isTrialing: ms > 0, isExpired: ms <= 0 }
}

/**
 * Whether a workspace may make changes (write access). Paid ("active"), comped
 * ("free"), or a trial that hasn't ended yet are all entitled. An ended trial is
 * not. Pure helper so it's easy to unit-test; callers resolve plan/trialEndsAt
 * from the workspace row (a missing row = brand-new account = entitled).
 */
export function isEntitled(
  plan: string | undefined,
  trialEndsAt: Date | null | undefined,
): boolean {
  const p = plan ?? "trial"
  if (p === "active" || p === "free") return true
  // trial (or unknown) → entitled only while the trial window is open.
  return !computeTrialStatus("trial", trialEndsAt ?? null).isExpired
}
