import {
  faqPageJsonLd,
  jsonLdHtml,
  organizationJsonLd,
  softwareJsonLd,
  websiteJsonLd,
} from "@/lib/marketing-schema"

function JsonLdScript({ data }: { data: unknown }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: jsonLdHtml(data) }}
    />
  )
}

export function MarketingJsonLd() {
  return (
    <>
      <JsonLdScript data={organizationJsonLd} />
      <JsonLdScript data={websiteJsonLd} />
      <JsonLdScript data={softwareJsonLd} />
      <JsonLdScript data={faqPageJsonLd} />
    </>
  )
}
