import { describe, expect, it } from "vitest"

import { activityHref } from "@/lib/activity-link"
import type { Activity } from "@/lib/crm-types"

function activity(overrides: Partial<Activity>): Activity {
  return {
    id: "a1",
    type: "created",
    message: "Something happened",
    contactId: "c1",
    contactName: "Jane Doe",
    companyId: "co1",
    companyName: "Acme",
    actorName: "System",
    refType: "",
    refId: "",
    at: "2026-01-01T00:00:00Z",
    ...overrides,
  }
}

describe("activityHref", () => {
  it("deep-links email activities to the specific message", () => {
    const a = activity({ type: "email_sent", refType: "message", refId: "msg_9" })
    expect(activityHref(a, false)).toBe("/app/contacts/c1?email=msg_9")
    expect(activityHref(a, true)).toBe("/app/contacts/c1?email=msg_9")
  })

  it("encodes the message id", () => {
    const a = activity({ type: "email_received", refType: "message", refId: "a b&c" })
    expect(activityHref(a, false)).toBe("/app/contacts/c1?email=a%20b%26c")
  })

  it("falls back to the contact's Emails section for email rows without a ref", () => {
    const a = activity({ type: "email_sent" })
    expect(activityHref(a, false)).toBe("/app/contacts/c1#emails")
  })

  it("links non-email rows to the contact only when context is shown", () => {
    const a = activity({ type: "note_added" })
    expect(activityHref(a, false)).toBeNull()
    expect(activityHref(a, true)).toBe("/app/contacts/c1")
  })

  it("links to the company when there is no contact (dashboard)", () => {
    const a = activity({ type: "created", contactId: "", companyId: "co1" })
    expect(activityHref(a, true)).toBe("/app/companies/co1")
  })

  it("returns null when there is nothing to link to", () => {
    const a = activity({ type: "created", contactId: "", companyId: "" })
    expect(activityHref(a, true)).toBeNull()
    expect(activityHref(a, false)).toBeNull()
  })
})
