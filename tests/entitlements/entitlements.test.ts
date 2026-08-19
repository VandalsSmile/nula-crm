import { describe, expect, it } from "vitest"

import { isEntitled, trialEndDate } from "@/lib/trial"

const future = () => trialEndDate() // 7 days out
const past = () => new Date(Date.now() - 1000)

describe("isEntitled", () => {
  it("paid ('active') plans always have write access", () => {
    expect(isEntitled("active", null)).toBe(true)
    expect(isEntitled("active", past())).toBe(true)
  })

  it("comped ('free') plans always have write access", () => {
    expect(isEntitled("free", null)).toBe(true)
    expect(isEntitled("free", past())).toBe(true)
  })

  it("an unexpired trial has write access", () => {
    expect(isEntitled("trial", future())).toBe(true)
  })

  it("an EXPIRED trial loses write access (no longer fails open)", () => {
    expect(isEntitled("trial", past())).toBe(false)
  })

  it("an unknown plan is treated like a trial and follows its window", () => {
    expect(isEntitled(undefined, future())).toBe(true)
    expect(isEntitled(undefined, past())).toBe(false)
  })
})
