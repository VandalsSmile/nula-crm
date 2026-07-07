import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Nula CRM — A better, easier way to manage customers for small business",
  description:
    "Friendly AI-first CRM for small businesses. Sell more, spend less time in your CRM. Simple follow-up, smart segmentation, and outreach that converts.",
  openGraph: {
    title: "Nula CRM",
    description: "The easier way to manage customers for small business — powered by AI.",
  },
}

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return children
}
