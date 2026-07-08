import { describe, expect, it } from "vitest"

import { contactFormSchema } from "@/lib/leads/contact-email"

describe("contactFormSchema", () => {
  it("accepts a valid submission and defaults optional fields", () => {
    const parsed = contactFormSchema.parse({
      name: "Maria Lopez",
      email: "maria@example.com",
      message: "I'd love a demo.",
    })
    expect(parsed.name).toBe("Maria Lopez")
    expect(parsed.phone).toBe("")
    expect(parsed.company).toBe("")
  })

  it("rejects an invalid email with a friendly message", () => {
    const result = contactFormSchema.safeParse({ name: "Bob", email: "nope", message: "hi" })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.some((i) => /valid email/i.test(i.message))).toBe(true)
    }
  })

  it("requires a name and a message", () => {
    expect(contactFormSchema.safeParse({ name: "", email: "a@b.com", message: "hi" }).success).toBe(false)
    expect(contactFormSchema.safeParse({ name: "A", email: "a@b.com", message: "" }).success).toBe(false)
  })

  it("keeps the honeypot field so the route can detect bots", () => {
    const parsed = contactFormSchema.parse({
      name: "A",
      email: "a@b.com",
      message: "hi",
      company: "botcorp",
    })
    expect(parsed.company).toBe("botcorp")
  })
})
