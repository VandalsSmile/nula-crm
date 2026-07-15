import { describe, expect, it } from "vitest"

import {
  DEFAULT_BUSINESS_TYPE,
  DEFAULT_GROUPS,
  DEFAULT_TAGS,
} from "@/lib/crm-defaults"

// Industry-specific terms that must NOT appear in the shipping ("general") set.
const INDUSTRY_TERMS = [
  "nad",
  "skinny",
  "myers",
  "glow",
  "drip",
  "weight-loss",
  "immunity",
  "recovery",
  "beauty",
  "member",
]

describe("shipping defaults are cross-business", () => {
  it("ships with the industry-neutral 'general' business type", () => {
    expect(DEFAULT_BUSINESS_TYPE).toBe("general")
  })

  it("general default tags contain no IV-therapy / wellness specifics", () => {
    const tags = DEFAULT_TAGS.general
    expect(tags.length).toBeGreaterThanOrEqual(8)
    for (const tag of tags) {
      for (const term of INDUSTRY_TERMS) {
        expect(tag.includes(term)).toBe(false)
      }
    }
  })

  it("general default tags include cross-business essentials", () => {
    const tags = DEFAULT_TAGS.general
    expect(tags).toContain("source-website")
    expect(tags).toContain("source-referral")
    expect(tags).toContain("needs-follow-up")
    expect(tags).toContain("high-value")
    expect(tags).toContain("do-not-contact")
  })

  it("general default groups are cross-business (no industry audiences)", () => {
    const groups = DEFAULT_GROUPS.general
    expect(groups).toContain("New Leads")
    expect(groups.join(" ")).not.toMatch(/NAD|Weight Loss|Beauty|Immunity/i)
  })
})
