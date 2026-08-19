import { describe, expect, it } from "vitest"

import { pickEditableContactFields } from "@/lib/contact-fields"

describe("pickEditableContactFields (mass-assignment guard)", () => {
  it("keeps only client-editable fields", () => {
    const patch = pickEditableContactFields({
      firstName: "Ada",
      lastName: "Lovelace",
      email: "ada@example.com",
      notes: "VIP",
    })
    expect(patch).toEqual({
      firstName: "Ada",
      lastName: "Lovelace",
      email: "ada@example.com",
      notes: "VIP",
    })
  })

  it("drops protected/unknown keys (userId, revenue, timestamps, id)", () => {
    const patch = pickEditableContactFields({
      firstName: "Ada",
      userId: "attacker-workspace",
      totalRevenueCents: 999999,
      createdAt: "2000-01-01",
      id: "ct_victim",
      lifecycleStage: "Customer",
    })
    expect(patch).toEqual({ firstName: "Ada", lifecycleStage: "Customer" })
    expect(patch).not.toHaveProperty("userId")
    expect(patch).not.toHaveProperty("totalRevenueCents")
    expect(patch).not.toHaveProperty("createdAt")
    expect(patch).not.toHaveProperty("id")
  })

  it("does not include foreign keys (validated separately)", () => {
    const patch = pickEditableContactFields({
      firstName: "Ada",
      companyId: "cmp_other",
      locationId: "loc_other",
      ownerId: "user_other",
      tagIds: ["tag_other"],
    })
    expect(patch).toEqual({ firstName: "Ada" })
  })

  it("coerces leadScore to a non-negative integer", () => {
    expect(pickEditableContactFields({ leadScore: 42 }).leadScore).toBe(42)
    expect(pickEditableContactFields({ leadScore: -5 }).leadScore).toBe(0)
    expect(pickEditableContactFields({ leadScore: 3.7 }).leadScore).toBe(4)
    expect(pickEditableContactFields({ leadScore: "not-a-number" }).leadScore).toBe(0)
  })
})
