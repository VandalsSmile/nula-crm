import { describe, expect, it } from "vitest"

import { renderCampaignEmail } from "@/lib/email/template"
import { sanitizeEmailHtml } from "@/lib/email/sanitize"

const brand = {
  companyName: "Acme Wellness",
  logoUrl: "https://cdn.example.com/logo.png",
  supportEmail: "hello@acme.test",
  address: "42 Main St, Riverside",
  website: "https://acme.test",
}

describe("renderCampaignEmail", () => {
  it("renders real rich HTML (headings, lists, bold) from the body", () => {
    const { html } = renderCampaignEmail({
      brand,
      bodyHtml: "<h2>Spring Sale</h2><ul><li>20% off</li></ul><strong>Ends Sunday</strong>",
    })
    expect(html).toContain("<h2>Spring Sale</h2>")
    expect(html).toContain("<li>20% off</li>")
    expect(html).toContain("<strong>Ends Sunday</strong>")
  })

  it("includes branded header + footer pulled from the account", () => {
    const { html } = renderCampaignEmail({ brand, bodyHtml: "<p>Hi</p>" })
    expect(html).toContain(brand.logoUrl) // header logo
    expect(html).toContain("Acme Wellness") // footer company name
    expect(html).toContain("42 Main St, Riverside") // physical address (CAN-SPAM)
    expect(html).toContain("mailto:hello@acme.test?subject=Unsubscribe") // opt-out path
  })

  it("renders an optional featured image above the copy", () => {
    const { html } = renderCampaignEmail({
      brand,
      bodyHtml: "<p>Hi</p>",
      featuredImageUrl: "https://cdn.example.com/feature.jpg",
    })
    expect(html).toContain("https://cdn.example.com/feature.jpg")
  })

  it("produces a plain-text alternative", () => {
    const { text } = renderCampaignEmail({ brand, bodyHtml: "<h2>Hi</h2><p>there</p>" })
    expect(text).toContain("Hi")
    expect(text).toContain("there")
    expect(text).not.toContain("<h2>")
  })
})

describe("sanitizeEmailHtml", () => {
  it("strips scripts, inline event handlers, and javascript: URLs", () => {
    const dirty =
      '<p onclick="steal()">hi</p><script>alert(1)</script><a href="javascript:evil()">x</a>'
    const clean = sanitizeEmailHtml(dirty)
    expect(clean).not.toMatch(/<script/i)
    expect(clean).not.toMatch(/onclick/i)
    expect(clean).not.toMatch(/javascript:/i)
    expect(clean).toContain("hi")
  })

  it("keeps normal formatting tags", () => {
    const clean = sanitizeEmailHtml("<h2>T</h2><ul><li>a</li></ul><strong>b</strong><a href=\"https://ok.test\">l</a>")
    expect(clean).toContain("<h2>T</h2>")
    expect(clean).toContain("<li>a</li>")
    expect(clean).toContain("<strong>b</strong>")
    expect(clean).toContain('href="https://ok.test"')
  })
})
