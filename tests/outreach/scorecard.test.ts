import { describe, expect, it } from "vitest"

import { assessTarget, signalMatches } from "@/lib/outreach/scorecard"
import { analyzeSite } from "@/lib/outreach/site-signals"
import { starterProfile } from "@/lib/outreach/starters"
import type { TargetFacts } from "@/lib/outreach/types"

const profile = starterProfile("b2b").data

const baseFacts: TargetFacts = {
  name: "Jane Doe",
  companyName: "Globex",
  website: "globex.com",
  industry: "",
  city: "",
  state: "",
  employeeCount: 0,
  revenueEstimate: "",
  decisionMaker: false,
  seniority: "",
  lifecycleStage: "New Lead",
  highValue: false,
  tags: [],
}

describe("signalMatches", () => {
  it("manual overrides always win over detection", () => {
    const highLtv = profile.signals.find((s) => s.id === "high-ltv")!
    expect(signalMatches(highLtv, { ...baseFacts, highValue: false, manual: { "high-ltv": true } })).toBe(true)
    expect(signalMatches(highLtv, { ...baseFacts, highValue: true, manual: { "high-ltv": false } })).toBe(false)
  })

  it("detects site-based signals", () => {
    const weak = profile.signals.find((s) => s.id === "weak-website")!
    expect(
      signalMatches(weak, {
        ...baseFacts,
        site: { hasClearCta: false, emailCapture: false, adsEvidence: false, reviews: false, blog: false, multiLocation: false },
      }),
    ).toBe(true)
    // Without site data the signal is simply not matched (not a false positive).
    expect(signalMatches(weak, baseFacts)).toBe(false)
  })
})

describe("assessTarget", () => {
  it("scores higher with more positive signals and recommends an angle", () => {
    const facts: TargetFacts = {
      ...baseFacts,
      highValue: true,
      decisionMaker: true,
      site: { hasClearCta: false, emailCapture: false, adsEvidence: true, reviews: true, blog: false, multiLocation: false },
    }
    const a = assessTarget(profile, facts, "sales")
    expect(a.score).toBeGreaterThan(20)
    expect(a.matched.length).toBeGreaterThan(0)
    expect(a.recommendedApproachId).toBeTruthy()
    expect(a.observe).toBeTruthy()
  })

  it("respects audience: BD-only angles aren't recommended for sales", () => {
    // 'system' is BD-only in the starter; force only the multi-channel signal.
    const facts: TargetFacts = {
      ...baseFacts,
      manual: { "multi-channel": true },
    }
    const sales = assessTarget(profile, facts, "sales")
    expect(sales.recommendedApproachId).not.toBe("system")
    const bd = assessTarget(profile, facts, "bd")
    expect(bd.recommendedApproachId).toBe("system")
  })

  it("applies disqualifiers (negative weight lowers the score)", () => {
    const withDq = assessTarget(profile, { ...baseFacts, manual: { "barely-markets": true } }, "sales")
    expect(withDq.score).toBeLessThan(20)
  })
})

describe("analyzeSite", () => {
  it("detects CTAs, email capture, ads, reviews, blog", () => {
    const html = `
      <a class="btn-cta" href="/contact">Book now</a>
      <form><input type="email" name="email" /></form>
      <script src="https://www.googletagmanager.com/gtag/js"></script>
      <div>4.8 stars from Google reviews</div>
      <a href="/blog">Blog</a>`
    const s = analyzeSite(html)
    expect(s.hasClearCta).toBe(true)
    expect(s.emailCapture).toBe(true)
    expect(s.adsEvidence).toBe(true)
    expect(s.reviews).toBe(true)
    expect(s.blog).toBe(true)
  })

  it("returns all-false for a bare brochure page", () => {
    const s = analyzeSite("<html><body><h1>Acme</h1><p>We do stuff.</p></body></html>")
    expect(s.hasClearCta).toBe(false)
    expect(s.emailCapture).toBe(false)
    expect(s.adsEvidence).toBe(false)
  })
})
