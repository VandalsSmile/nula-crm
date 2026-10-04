import { describe, expect, it } from "vitest"

import { interpretCommand } from "@/lib/ai/interpreter"

describe("Outreach Advisor command-bar intents", () => {
  it("routes 'draft a cold email to X' to draft_outreach with the target", () => {
    const r = interpretCommand("draft a cold email to Jane Doe")
    expect(r.intent).toBe("draft_outreach")
    expect(r.params.query).toBe("Jane Doe")
    expect(r.requiresApproval).toBe(false)
  })

  it("routes 'write outreach for Acme' to draft_outreach", () => {
    const r = interpretCommand("write outreach for Acme Corp")
    expect(r.intent).toBe("draft_outreach")
    expect(r.params.query).toBe("Acme Corp")
  })

  it("routes 'what's the best angle for X' to outreach_angle", () => {
    const r = interpretCommand("what's the best angle for Jane Doe?")
    expect(r.intent).toBe("outreach_angle")
    expect(r.params.query).toBe("Jane Doe")
    expect(r.requiresApproval).toBe(false)
  })

  it("routes 'how should I approach X' to outreach_angle", () => {
    const r = interpretCommand("how should I approach Globex")
    expect(r.intent).toBe("outreach_angle")
    expect(r.params.query).toBe("Globex")
  })

  it("picks up BD audience", () => {
    const r = interpretCommand("draft a cold outreach email to Jane for BD")
    expect(r.intent).toBe("draft_outreach")
    expect(r.params.audience).toBe("bd")
  })

  it("does not hijack a plain follow-up email request", () => {
    const r = interpretCommand("write a follow-up email about pricing")
    expect(r.intent).toBe("draft_follow_up")
  })
})
