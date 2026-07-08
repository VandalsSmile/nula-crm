import { describe, expect, it } from "vitest"

import { interpretCommand, productKeywordsForIntent } from "@/lib/ai/interpreter"

describe("interpretCommand (regex fallback)", () => {
  it("maps tag commands to apply_tag (not add_to_group)", () => {
    const result = interpretCommand("tag all who bought the gold plan")
    expect(result.intent).toBe("apply_tag")
    expect(result.requiresApproval).toBe(true)
    expect(result.params.tagName).toBeTruthy()
    expect(result.params.product).toContain("gold plan")
  })

  it("detects reactivation campaigns and requires approval", () => {
    const result = interpretCommand("create a reactivation campaign for customers inactive 90 days")
    expect(result.intent).toBe("create_reactivation_campaign")
    expect(result.requiresApproval).toBe(true)
  })

  it("routes move/add-to-group commands to add_to_group", () => {
    const result = interpretCommand("move NAD buyers into the VIP group")
    expect(result.intent).toBe("add_to_group")
    expect(result.params.groupName).toContain("vip")
  })

  it("treats find-duplicates as a read-only action with accurate criteria", () => {
    const result = interpretCommand("find duplicate contacts")
    expect(result.intent).toBe("find_duplicates")
    expect(result.requiresApproval).toBe(false)
    expect(result.preview.criteria.join(" ").toLowerCase()).not.toContain("fuzzy")
  })

  it("treats draft follow-up as read-only", () => {
    const result = interpretCommand("write a follow-up email about our new offer")
    expect(result.intent).toBe("draft_follow_up")
    expect(result.requiresApproval).toBe(false)
  })

  it("falls back to unknown for unrecognized input", () => {
    const result = interpretCommand("asdfghjkl")
    expect(result.intent).toBe("unknown")
  })
})

describe("productKeywordsForIntent", () => {
  it("normalizes the product term without hardcoded (wellness) synonyms", () => {
    expect(productKeywordsForIntent("Gold Plan")).toEqual(["gold plan"])
  })

  it("drops empty input", () => {
    expect(productKeywordsForIntent("   ")).toEqual([])
  })
})
