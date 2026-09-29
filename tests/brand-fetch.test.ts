import { describe, expect, it } from "vitest"

import { contactAddresses, normalizePhone, parseAddressString } from "@/lib/brand-fetch"

describe("normalizePhone", () => {
  it("formats a plain 10-digit US number", () => {
    expect(normalizePhone("3125550199")).toBe("(312) 555-0199")
  })

  it("formats common human-written US formats consistently", () => {
    expect(normalizePhone("(312) 555-0199")).toBe("(312) 555-0199")
    expect(normalizePhone("312.555.0199")).toBe("(312) 555-0199")
    expect(normalizePhone("312-555-0199")).toBe("(312) 555-0199")
    expect(normalizePhone("+1 (312) 555-0199")).toBe("(312) 555-0199")
    expect(normalizePhone("1-312-555-0199")).toBe("(312) 555-0199")
  })

  it("decodes tel: percent-encoding", () => {
    expect(normalizePhone("%2B1%20312%20555%200199")).toBe("(312) 555-0199")
  })

  it("does NOT merge extension / pause digits into the main number (the munging bug)", () => {
    // tel: links often append DTMF pauses or extensions after , or ;
    expect(normalizePhone("+13125550199,,123")).toBe("(312) 555-0199")
    expect(normalizePhone("+1-312-555-0199;ext=456")).toBe("(312) 555-0199")
    expect(normalizePhone("312-555-0199 ext. 789")).toBe("(312) 555-0199")
    expect(normalizePhone("(312) 555-0199 x42")).toBe("(312) 555-0199")
  })

  it("keeps international numbers behind a single leading +", () => {
    expect(normalizePhone("+44 20 7946 0958")).toBe("+442079460958")
    expect(normalizePhone("tel:+61-2-1234-5678".replace(/^tel:/, ""))).toBe("+61212345678")
  })

  it("rejects strings without a plausible number", () => {
    expect(normalizePhone("")).toBeNull()
    expect(normalizePhone(null)).toBeNull()
    expect(normalizePhone("call us!")).toBeNull()
    expect(normalizePhone("123-4567")).toBeNull() // only 7 digits
  })
})

describe("parseAddressString", () => {
  it("parses a full street address with zip", () => {
    expect(parseAddressString("123 Main St, Chicago, IL 60601")).toEqual({
      street: "123 Main St",
      city: "Chicago",
      state: "IL",
      zip: "60601",
    })
  })

  it("keeps suite/unit lines in the street when the city is the last segment", () => {
    expect(parseAddressString("123 Main St, Suite 5, Chicago, IL 60601")).toEqual({
      street: "123 Main St, Suite 5",
      city: "Chicago",
      state: "IL",
      zip: "60601",
    })
  })

  it("parses city/state without a street", () => {
    expect(parseAddressString("Chicago, IL 60601")).toEqual({
      street: "",
      city: "Chicago",
      state: "IL",
      zip: "60601",
    })
  })
})

describe("contactAddresses (schema.org JSON-LD)", () => {
  it("pulls street, city, normalized state, and zip from PostalAddress", () => {
    const html = `<!doctype html><html><head>
      <script type="application/ld+json">
      {"@context":"https://schema.org","@type":"LocalBusiness","name":"Acme",
       "telephone":"+1 (312) 555-0199",
       "address":{"@type":"PostalAddress","streetAddress":"500 W Madison St",
         "addressLocality":"Chicago","addressRegion":"Illinois","postalCode":"60661"}}
      </script></head><body></body></html>`
    const addresses = contactAddresses(html)
    expect(addresses[0]).toEqual({
      street: "500 W Madison St",
      city: "Chicago",
      state: "IL",
      zip: "60661",
    })
  })

  it("reads microdata itemprops when JSON-LD is absent", () => {
    const html = `<div itemscope itemtype="http://schema.org/PostalAddress">
      <span itemprop="streetAddress">1 Market St</span>
      <span itemprop="addressLocality">San Francisco</span>
      <span itemprop="addressRegion">CA</span>
      <span itemprop="postalCode">94105</span>
    </div>`
    const addresses = contactAddresses(html)
    expect(addresses[0]).toEqual({
      street: "1 Market St",
      city: "San Francisco",
      state: "CA",
      zip: "94105",
    })
  })
})
