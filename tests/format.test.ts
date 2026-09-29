import { describe, expect, it } from "vitest"

import { formatDate, relativeTime } from "@/lib/format"

const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

describe("relativeTime", () => {
  it("shows relative labels for sub-day ages", () => {
    expect(relativeTime(new Date().toISOString())).toBe("just now")
    expect(relativeTime(new Date(Date.now() - 5 * MINUTE).toISOString())).toBe("5m ago")
    expect(relativeTime(new Date(Date.now() - 3 * HOUR).toISOString())).toBe("3h ago")
  })

  it("shows the actual date once something is a day or more old (no more '75d ago')", () => {
    const iso = new Date(Date.now() - 75 * DAY).toISOString()
    const result = relativeTime(iso)
    expect(result).toBe(formatDate(iso))
    expect(result).not.toMatch(/\d+d ago/)
    expect(result).toMatch(/^[A-Z][a-z]{2} \d{1,2}, \d{4}$/) // e.g. "Jul 16, 2026"
  })

  it("shows the date at exactly one day old", () => {
    const iso = new Date(Date.now() - 25 * HOUR).toISOString()
    expect(relativeTime(iso)).toBe(formatDate(iso))
  })
})
