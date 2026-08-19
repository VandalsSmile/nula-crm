import { describe, expect, it } from "vitest"

import { randomId } from "@/lib/library-helpers"

describe("randomId (crypto-strong token generator)", () => {
  it("prefixes the id and uses a URL/email-safe lowercase alphanumeric body", () => {
    const id = randomId("lf")
    expect(id).toMatch(/^lf_[0-9a-z]+$/)
  })

  it("produces unique values across many calls (no collisions)", () => {
    const seen = new Set<string>()
    for (let i = 0; i < 5000; i++) seen.add(randomId("ct"))
    expect(seen.size).toBe(5000)
  })

  it("does not repeat the same value on consecutive calls", () => {
    expect(randomId("k")).not.toBe(randomId("k"))
  })

  it("has a substantial random body (not a short Math.random slice)", () => {
    const body = randomId("x").split("_")[1] ?? ""
    expect(body.length).toBeGreaterThanOrEqual(16)
  })
})
