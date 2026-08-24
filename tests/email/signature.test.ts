import { describe, expect, it } from "vitest"

import {
  hasSignatureContent,
  renderSignatureHtml,
  renderSignatureText,
  type SignatureFields,
} from "@/lib/email/signature-render"

const full: SignatureFields = {
  enabled: true,
  fullName: "Jane Doe",
  title: "Account Manager",
  company: "Acme Co.",
  phone: "(555) 123-4567",
  email: "jane@acme.com",
  website: "acme.com",
  logoUrl: "https://cdn.example.com/logo.png",
  tagline: "Helping small businesses grow",
}

describe("hasSignatureContent", () => {
  it("is false when disabled, empty, or null", () => {
    expect(hasSignatureContent(null)).toBe(false)
    expect(hasSignatureContent({})).toBe(false)
    expect(hasSignatureContent({ ...full, enabled: false })).toBe(false)
  })
  it("is true when enabled with any content", () => {
    expect(hasSignatureContent({ fullName: "Jane" })).toBe(true)
    expect(hasSignatureContent(full)).toBe(true)
  })
})

describe("renderSignatureHtml", () => {
  it("includes name, role, contacts, logo, and links", () => {
    const html = renderSignatureHtml(full)
    expect(html).toContain("Jane Doe")
    expect(html).toContain("Account Manager, Acme Co.")
    expect(html).toContain('href="mailto:jane@acme.com"')
    expect(html).toContain('href="https://acme.com"') // bare domain gets https://
    expect(html).toContain('<img src="https://cdn.example.com/logo.png"')
    expect(html).toContain("Helping small businesses grow")
  })
  it("escapes HTML in fields", () => {
    const html = renderSignatureHtml({ fullName: "<script>x</script>" })
    expect(html).not.toContain("<script>x</script>")
    expect(html).toContain("&lt;script&gt;")
  })
})

describe("renderSignatureText", () => {
  it("renders a plain-text block with a separator", () => {
    const text = renderSignatureText(full)
    expect(text).toContain("--")
    expect(text).toContain("Jane Doe")
    expect(text).toContain("Account Manager, Acme Co.")
    expect(text).toContain("jane@acme.com")
  })
})
