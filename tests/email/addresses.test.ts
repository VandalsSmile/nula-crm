import { describe, expect, it } from "vitest"

import { invalidEmailTokens, isEmailish, MAX_RECIPIENTS, parseEmailList } from "@/lib/email/addresses"

describe("isEmailish", () => {
  it("accepts normal addresses and rejects junk", () => {
    expect(isEmailish("a@b.com")).toBe(true)
    expect(isEmailish("  jane.doe@example.co.uk ")).toBe(true)
    expect(isEmailish("nope")).toBe(false)
    expect(isEmailish("a@b")).toBe(false)
    expect(isEmailish("")).toBe(false)
  })
})

describe("parseEmailList", () => {
  it("splits on commas/semicolons/whitespace, lowercases, dedupes, drops invalid", () => {
    expect(parseEmailList("A@B.com, a@b.com; c@d.io  x@y.org")).toEqual([
      "a@b.com",
      "c@d.io",
      "x@y.org",
    ])
    expect(parseEmailList("nope, also-bad")).toEqual([])
    expect(parseEmailList("")).toEqual([])
    expect(parseEmailList(null)).toEqual([])
  })
  it("caps the number of recipients", () => {
    const many = Array.from({ length: MAX_RECIPIENTS + 5 }, (_, i) => `u${i}@x.com`).join(",")
    expect(parseEmailList(many)).toHaveLength(MAX_RECIPIENTS)
  })
})

describe("invalidEmailTokens", () => {
  it("returns only the non-email tokens", () => {
    expect(invalidEmailTokens("good@x.com, bogus, also@ok.com, @nope")).toEqual(["bogus", "@nope"])
    expect(invalidEmailTokens("all@good.com, fine@ok.com")).toEqual([])
  })
})
