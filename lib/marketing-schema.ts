import { SITE_DESCRIPTION, SITE_NAME, SITE_TAGLINE, SITE_URL } from "@/lib/seo"

/** Homepage FAQ copy. The visible section and FAQPage JSON-LD both read this. */
export const HOME_FAQS = [
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
] as const

/** Public sales line. Display text and the tel: href stay paired. */
export const SALES_PHONE_DISPLAY = "256-474-3628"
export const SALES_PHONE_TEL = "+12564743628"
export const SALES_EMAIL = "sales@vs.marketing"

/** Existing public inbox. Kept alongside the sales address. */
export const GENERAL_EMAIL = "info@nulacrm.ai"

const WEEKDAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
] as const

export const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: SITE_NAME,
  url: SITE_URL,
  description: SITE_DESCRIPTION,
  email: [GENERAL_EMAIL, SALES_EMAIL],
  telephone: SALES_PHONE_DISPLAY,
  contactPoint: {
    "@type": "ContactPoint",
    contactType: "sales",
    telephone: SALES_PHONE_DISPLAY,
    email: SALES_EMAIL,
  },
  openingHoursSpecification: {
    "@type": "OpeningHoursSpecification",
    dayOfWeek: [...WEEKDAYS],
    opens: "08:00",
    closes: "17:00",
  },
}

export const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: SITE_NAME,
  url: SITE_URL,
  description: SITE_TAGLINE,
}

export const softwareJsonLd = {
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

export const faqPageJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: HOME_FAQS.map((item) => ({
    "@type": "Question",
    name: item.question,
    acceptedAnswer: {
      "@type": "Answer",
      text: item.answer,
    },
  })),
}

/** JSON.stringify for a script tag, with `<` escaped per the Next.js JSON-LD guide. */
export function jsonLdHtml(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c")
}
