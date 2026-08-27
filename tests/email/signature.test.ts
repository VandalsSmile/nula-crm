import { describe, expect, it } from "vitest"

import {
  fitLogoDimensions,
  hasSignatureContent,
  LOGO_MAX_HEIGHT,
  LOGO_MAX_WIDTH,
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
  it("emits explicit width/height for the logo when dimensions are known", () => {
    const html = renderSignatureHtml({ ...full, logoWidth: 180, logoHeight: 40 })
    expect(html).toContain('width="180" height="40"')
    expect(html).toContain("width:180px;height:40px;")
  })
  it("always pins the logo height even when dimensions are unknown", () => {
    // An oversized upload without stored dims must still be capped, because many
    // clients ignore max-height CSS — so we pin the height *attribute*.
    const html = renderSignatureHtml(full)
    expect(html).toContain(`height="${LOGO_MAX_HEIGHT}"`)
    expect(html).toContain(`max-width:${LOGO_MAX_WIDTH}px`)
  })
  it("wraps the logo in a light chip for dark-mode legibility", () => {
    const html = renderSignatureHtml(full)
    expect(html).toContain("background:#ffffff")
  })
})

describe("fitLogoDimensions", () => {
  it("shrinks large logos into the box, preserving aspect ratio", () => {
    // Tall/near-square logo (like the reported oversized one) is bound by height.
    expect(fitLogoDimensions(500, 560)).toEqual({ width: 43, height: 48 })
    // Wide logo is bound by width.
    expect(fitLogoDimensions(800, 200)).toEqual({ width: 180, height: 45 })
  })
  it("never enlarges a small logo", () => {
    expect(fitLogoDimensions(120, 30)).toEqual({ width: 120, height: 30 })
  })
  it("returns zeros for unknown source size", () => {
    expect(fitLogoDimensions(0, 0)).toEqual({ width: 0, height: 0 })
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
