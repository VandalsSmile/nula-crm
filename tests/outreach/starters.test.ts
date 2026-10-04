import { describe, expect, it } from "vitest"

import { DEFAULT_FORMULA, starterProfile } from "@/lib/outreach/starters"

describe("starterProfile", () => {
  it("builds a usable starter playbook for any business type", () => {
    const { name, data } = starterProfile("b2b")
    expect(name).toBeTruthy()
    expect(data.approaches.length).toBeGreaterThan(0)
    expect(data.signals.length).toBeGreaterThan(0)
    expect(data.verticals.length).toBe(1)
    expect(data.formula).toEqual(DEFAULT_FORMULA)
    // Positioning/offerings are the account's own — left blank to fill in.
    expect(data.positioning).toBe("")
    expect(data.offerings).toEqual([])
  })

  it("labels the starter vertical from the business type", () => {
    expect(starterProfile("home-services").data.verticals[0].label).toBe("Home services")
    expect(starterProfile("general").data.verticals[0].label).toBe("General / other")
  })

  it("every signal's approachId references a real approach (or is empty)", () => {
    const { data } = starterProfile("professional")
    const ids = new Set(data.approaches.map((a) => a.id))
    for (const s of data.signals) {
      if (s.approachId) expect(ids.has(s.approachId)).toBe(true)
    }
  })

  it("has at least one disqualifier (negative weight)", () => {
    const { data } = starterProfile("fitness")
    expect(data.signals.some((s) => s.weight < 0)).toBe(true)
  })

  it("the default formula is the OBSERVE→IMPACT→POV→PROOF→QUESTION shape", () => {
    expect(DEFAULT_FORMULA.map((s) => s.key)).toEqual(["observe", "impact", "pov", "proof", "question"])
  })
})
