/**
 * Outreach Advisor — the account-customizable cold-outreach playbook.
 *
 * This models the structure of a Sales/BD targeting guide (positioning →
 * research signals → angles → vertical tailoring → formula → do-not-send) so
 * each workspace fills it in with their own content. See docs/outreach-advisor.md.
 *
 * Part of the upgraded intelligence package (B2B Intelligence add-on).
 */

export type OutreachAudience = "sales" | "bd"

/** Where a scoring signal is observed from. */
export const SIGNAL_SOURCES = ["self", "enrichment", "site", "manual"] as const
export type SignalSource = (typeof SIGNAL_SOURCES)[number]

/** A thing to look for when qualifying a target; contributes to the scorecard. */
export type OutreachSignal = {
  id: string
  label: string
  description: string
  /** Contribution to fit; negative = disqualifier. */
  weight: number
  source: SignalSource
  /** Which approach this signal argues for ("" = none). */
  approachId: string
  /** How strongly it argues for that approach. */
  approachWeight: number
}

/** An outreach angle / play (e.g. "Where is the money leaking?"). */
export type OutreachApproach = {
  id: string
  name: string
  useWhen: string
  pointToMake: string
  conversationStarter: string
  dontUseWhen: string
  audiences: OutreachAudience[]
  /** Optional, verifiable case study / result — only cited when present. */
  proof: string
}

/** A vertical the account sells into, with its primary problem + preferred angles. */
export type OutreachVertical = {
  id: string
  label: string
  primaryProblem: string
  strongQuestions: string[]
  preferredApproachIds: string[]
}

/** One step of the outreach formula (OBSERVE → IMPACT → POV → PROOF → QUESTION). */
export type FormulaStep = { key: string; label: string; guidance: string }

/** The editable body of a profile (stored as JSONB). */
export type OutreachProfileData = {
  positioning: string
  valueProp: string
  offerings: string[]
  verticals: OutreachVertical[]
  signals: OutreachSignal[]
  approaches: OutreachApproach[]
  formula: FormulaStep[]
  doNotSend: string[]
}

/** The full profile as surfaced to the UI. */
export type OutreachProfile = OutreachProfileData & {
  id: string
  name: string
  updatedAt: string
}

/** Input accepted by the save action (whole-profile upsert). */
export type OutreachProfileInput = Partial<OutreachProfileData> & { name?: string }
