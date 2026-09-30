import { describe, expect, it } from "vitest"

import { contactFullName, personName } from "@/lib/crm-types"

describe("personName", () => {
  it("joins first/last and returns empty (falsy) when neither is set", () => {
    expect(personName("Ada", "Lovelace")).toBe("Ada Lovelace")
    expect(personName("Ada", "")).toBe("Ada")
    expect(personName("", "Lovelace")).toBe("Lovelace")
    // Crucially falsy so `personName(...) || companyName || …` chains fall through.
    expect(personName("", "")).toBe("")
  })
})

describe("contactFullName", () => {
  it("still falls back to 'Unnamed contact' for standalone display", () => {
    expect(contactFullName("Ada", "Lovelace")).toBe("Ada Lovelace")
    expect(contactFullName("", "")).toBe("Unnamed contact")
  })
})

describe("company-only contact display name (list/search regression)", () => {
  // Mirrors the fallback chain used for target-list members, AI search, etc.
  const displayName = (c: { firstName: string; lastName: string; name: string; companyName: string; email: string }) =>
    personName(c.firstName, c.lastName) || c.name || c.companyName || c.email || "Unnamed contact"

  it("uses the company name for a contact with no personal name (was 'Unnamed contact')", () => {
    expect(
      displayName({ firstName: "", lastName: "", name: "", companyName: "Acme Health Clinic", email: "" }),
    ).toBe("Acme Health Clinic")
  })

  it("still prefers a real person name when present", () => {
    expect(
      displayName({ firstName: "Ada", lastName: "Lovelace", name: "", companyName: "Acme", email: "a@b.com" }),
    ).toBe("Ada Lovelace")
  })

  it("falls back to email, then Unnamed contact", () => {
    expect(displayName({ firstName: "", lastName: "", name: "", companyName: "", email: "a@b.com" })).toBe("a@b.com")
    expect(displayName({ firstName: "", lastName: "", name: "", companyName: "", email: "" })).toBe("Unnamed contact")
  })
})
