import { fitScoreLabel } from "@/lib/enrichment/fit-score"
import type {
  Assessment,
  MatchedSignal,
  OutreachAudience,
  OutreachProfileData,
  OutreachSignal,
  TargetFacts,
} from "@/lib/outreach/types"

/**
 * Built-in detection for the starter signal ids. Returns undefined when the data
 * needed to decide isn't available (so the signal is simply "not matched" unless
 * a rep marks it manually). Custom signals with no built-in detector rely on
 * manual research overrides.
 */
function detectBuiltin(id: string, f: TargetFacts): boolean | undefined {
  const site = f.site
  switch (id) {
    case "weak-website":
      return site ? !site.hasClearCta : undefined
    case "running-ads":
      return site ? site.adsEvidence : undefined
    case "high-ltv":
      return f.highValue
    case "multi-channel": {
      if (!site) return undefined
      const activity = [site.adsEvidence, site.reviews, site.blog, site.emailCapture, site.multiLocation].filter(
        Boolean,
      ).length
      return activity >= 3
    }
    case "decision-maker":
      return f.decisionMaker
    case "right-size":
      return f.employeeCount >= 10 || Boolean(f.revenueEstimate)
    case "barely-markets":
      return site ? !site.adsEvidence && !site.emailCapture && !site.blog : undefined
    default:
      return undefined
  }
}

/** Whether a signal is matched for a target. Manual overrides always win. */
export function signalMatches(signal: OutreachSignal, facts: TargetFacts): boolean {
  const manual = facts.manual?.[signal.id]
  if (typeof manual === "boolean") return manual
  return detectBuiltin(signal.id, facts) === true
}

function observeFromSignal(m: MatchedSignal): string {
  switch (m.signalId) {
    case "weak-website":
      return "your website doesn't give visitors a clear next step"
    case "running-ads":
      return "you're running ads, but the page they land on isn't built to convert"
    case "high-ltv":
      return "a single new customer is worth a lot in your business"
    case "multi-channel":
      return "you're active across several channels, but they don't look connected"
    case "decision-maker":
      return "you're the person who'd own a decision like this"
    case "right-size":
      return "you're at the size where getting this right really pays off"
    default:
      return m.label.toLowerCase()
  }
}

/**
 * Transparent, no-ML target scorecard. Sums matched signal weights (like
 * computeFitScore / calculateLeadScore), picks the best-supported angle for the
 * chosen audience, and derives the grounded observe/impact fill-ins.
 */
export function assessTarget(
  profile: OutreachProfileData,
  facts: TargetFacts,
  audience: OutreachAudience = "sales",
): Assessment {
  const matched: MatchedSignal[] = profile.signals
    .filter((s) => signalMatches(s, facts))
    .map((s) => ({ signalId: s.id, label: s.label, weight: s.weight, source: s.source }))

  const raw = 20 + matched.reduce((sum, m) => sum + m.weight, 0)
  const score = Math.max(0, Math.min(100, Math.round(raw)))
  const label = fitScoreLabel(score)

  // Which angle do the matched signals argue for?
  const matchedIds = new Set(matched.map((m) => m.signalId))
  const approachScore = new Map<string, number>()
  for (const s of profile.signals) {
    if (!matchedIds.has(s.id) || !s.approachId) continue
    approachScore.set(s.approachId, (approachScore.get(s.approachId) ?? 0) + s.approachWeight)
  }

  const eligible = profile.approaches.filter(
    (a) => a.audiences.length === 0 || a.audiences.includes(audience),
  )
  const eligibleIds = new Set(eligible.map((a) => a.id))

  let ranked = [...approachScore.entries()]
    .filter(([id]) => eligibleIds.has(id))
    .sort((a, b) => b[1] - a[1])
    .map(([id]) => id)

  if (ranked.length === 0) {
    const vpref = [...new Set(profile.verticals.flatMap((v) => v.preferredApproachIds))].filter((id) =>
      eligibleIds.has(id),
    )
    ranked = vpref.length ? vpref : eligible.map((a) => a.id)
  }

  const recommendedApproachId = ranked[0] ?? ""
  const recommendedApproach = profile.approaches.find((a) => a.id === recommendedApproachId)
  const alternativeApproachIds = ranked.slice(1, 3)

  const topSignal =
    matched.find((m) => profile.signals.find((s) => s.id === m.signalId)?.approachId === recommendedApproachId) ??
    matched[0]

  const observe = topSignal ? observeFromSignal(topSignal) : ""
  const impact = recommendedApproach?.pointToMake ?? ""
  const rationale = matched.length
    ? `Matched ${matched.slice(0, 3).map((m) => m.label).join(", ")}${
        recommendedApproach ? ` → ${recommendedApproach.name}` : ""
      }`
    : "Not enough signals yet — do a quick research pass or mark what you see."

  return {
    score,
    label,
    matched,
    recommendedApproachId,
    recommendedApproachName: recommendedApproach?.name ?? "",
    alternativeApproachIds,
    observe,
    impact,
    rationale,
    audience,
  }
}
