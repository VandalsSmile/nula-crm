import { describe, expect, it } from "vitest"

import { calculateLeadScore, recommendedNextActionForLead } from "@/lib/leads/scoring"

describe("calculateLeadScore", () => {
  it("starts from a baseline for a bare lead", () => {
    expect(calculateLeadScore({})).toBe(25)
  })

  it("rewards contact details (email + phone)", () => {
    const score = calculateLeadScore({ email: "a@b.com", phone: "555-1234" })
    // baseline 25 + email 8 + phone 12
    expect(score).toBe(45)
  })

  it("boosts high-intent sources and keywords", () => {
    const referral = calculateLeadScore({ source: "referral" })
    // baseline 25 + high-intent 20 + referral 15
    expect(referral).toBe(60)

    const withKeywords = calculateLeadScore({
      source: "website-form",
      message: "What is your pricing? I'd like to book an appointment today.",
    })
    expect(withKeywords).toBeGreaterThan(45)
  })

  it("clamps the score between 0 and 100", () => {
    const maxed = calculateLeadScore({
      source: "referral",
      email: "a@b.com",
      phone: "555-1234",
      message: "pricing price book appointment available schedule cost today asap urgent",
    })
    expect(maxed).toBe(100)
  })
})

describe("recommendedNextActionForLead", () => {
  it("recommends an urgent call for hot leads", () => {
    expect(recommendedNextActionForLead(90)).toMatch(/call within 15 minutes/i)
  })

  it("recommends nurture for low-mid scores", () => {
    expect(recommendedNextActionForLead(30)).toMatch(/nurture/i)
  })

  it("falls back to a review action for cold leads", () => {
    expect(recommendedNextActionForLead(5, "unknown-source")).toMatch(/review lead quality/i)
  })
})
