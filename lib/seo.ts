import type { Metadata } from "next"

export const SITE_NAME = "Nula CRM"
export const SITE_TAGLINE = "A better, easier way to manage customers for small business"
export const SITE_DESCRIPTION =
  "Nula is an AI-first CRM for small businesses. Tell it what you need in plain English — it organizes contacts, suggests next steps, and helps you follow up without CRM complexity."
export const SITE_URL =
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "https://nula-crm.vercel.app"

type PageMetaInput = {
  title: string
  description: string
  path?: string
  /** Public marketing pages should be indexed; app pages should not. */
  index?: boolean
  image?: string
}

export function absoluteUrl(path = "/"): string {
  const normalized = path.startsWith("/") ? path : `/${path}`
  return `${SITE_URL}${normalized}`
}

export function pageMetadata({
  title,
  description,
  path = "/",
  index = false,
  image = "/marketing/illustrations/hero.png",
  absoluteTitle = false,
}: PageMetaInput & { absoluteTitle?: boolean }): Metadata {
  const url = absoluteUrl(path)
  const ogImage = image.startsWith("http") ? image : absoluteUrl(image)

  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    alternates: { canonical: url },
    robots: index
      ? { index: true, follow: true, googleBot: { index: true, follow: true } }
      : { index: false, follow: false, googleBot: { index: false, follow: false } },
    openGraph: {
      type: "website",
      locale: "en_US",
      url,
      siteName: SITE_NAME,
      title,
      description,
      images: [{ url: ogImage, width: 1200, height: 900, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
  }
}

export const marketingHomeMetadata = pageMetadata({
  title: `${SITE_NAME} — ${SITE_TAGLINE}`,
  description:
    "Friendly AI-first CRM for small businesses. Sell more without the CRM headache — simple follow-up, smart segmentation, and outreach that converts. No IT team required.",
  path: "/",
  index: true,
  absoluteTitle: true,
})

export const loginMetadata = pageMetadata({
  title: "Sign in",
  description:
    "Sign in to your Nula CRM workspace. AI-first customer management for small business teams — follow-ups, outreach, and growth in one place.",
  path: "/login",
  index: true,
})

export const appPrivateMetadata = pageMetadata({
  title: SITE_NAME,
  description: SITE_DESCRIPTION,
  path: "/app",
  index: false,
})

export function appPageMetadata(
  section: string,
  description: string,
  path: string,
): Metadata {
  return pageMetadata({
    title: section,
    description,
    path,
    index: false,
  })
}
