import { SITE_DESCRIPTION, SITE_NAME, SITE_TAGLINE, SITE_URL } from "@/lib/seo"

const faq = [
  {
    question: "What is Nula CRM?",
    answer:
      "Nula is an AI-first CRM built for small businesses. You tell it what you need in plain English and it organizes your contacts, suggests next steps, and helps you follow up — without complex configuration.",
  },
  {
    question: "Who is Nula CRM for?",
    answer:
      "Nula is for small business owners and teams — med spas, wellness studios, home services, fitness, and local retail — who want customers coming back without wrestling enterprise CRM software.",
  },
  {
    question: "How does Nula help small businesses sell more?",
    answer:
      "Nula handles lead follow-up, smart segmentation, campaign drafts, and contact organization so owners spend less time in software and more time with customers.",
  },
  {
    question: "Do I need an IT team to use Nula?",
    answer:
      "No. Nula is designed for non-technical small business owners. You approve every AI action, work in plain English, and preview changes before anything runs.",
  },
]

export function MarketingJsonLd() {
  const organization = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: SITE_URL,
    email: "info@nulacrm.ai",
    description: SITE_DESCRIPTION,
  }

  const website = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: SITE_URL,
    description: SITE_TAGLINE,
  }

  const software = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: SITE_NAME,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    url: SITE_URL,
    description: SITE_DESCRIPTION,
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      description: "Get started free",
    },
  }

  const faqPage = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organization) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(website) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(software) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqPage) }} />
    </>
  )
}
