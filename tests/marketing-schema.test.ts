import { describe, expect, it } from "vitest"

import {
  GENERAL_EMAIL,
  HOME_FAQS,
  SALES_EMAIL,
  SALES_PHONE_DISPLAY,
  SALES_PHONE_TEL,
  faqPageJsonLd,
  organizationJsonLd,
} from "@/lib/marketing-schema"

describe("homepage FAQ schema", () => {
  it("uses the same questions and answers as the visible FAQ source", () => {
    expect(faqPageJsonLd["@type"]).toBe("FAQPage")
    expect(faqPageJsonLd.mainEntity).toHaveLength(HOME_FAQS.length)
    faqPageJsonLd.mainEntity.forEach((entity, index) => {
      expect(entity["@type"]).toBe("Question")
      expect(entity.name).toBe(HOME_FAQS[index].question)
      expect(entity.acceptedAnswer["@type"]).toBe("Answer")
      expect(entity.acceptedAnswer.text).toBe(HOME_FAQS[index].answer)
    })
  })
})

describe("organization schema", () => {
  it("includes the sales phone, email, and weekday hours", () => {
    expect(organizationJsonLd["@type"]).toBe("Organization")
    expect(organizationJsonLd.telephone).toBe(SALES_PHONE_DISPLAY)
    expect(organizationJsonLd.email).toEqual([GENERAL_EMAIL, SALES_EMAIL])
    expect(organizationJsonLd.contactPoint).toEqual({
      "@type": "ContactPoint",
      contactType: "sales",
      telephone: SALES_PHONE_DISPLAY,
      email: SALES_EMAIL,
    })
    expect(organizationJsonLd.openingHoursSpecification).toEqual({
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      opens: "08:00",
      closes: "17:00",
    })
    expect(SALES_PHONE_TEL).toBe("+12564743628")
    expect(organizationJsonLd).not.toHaveProperty("address")
    expect(organizationJsonLd).not.toHaveProperty("geo")
    expect(organizationJsonLd).not.toHaveProperty("sameAs")
  })
})
