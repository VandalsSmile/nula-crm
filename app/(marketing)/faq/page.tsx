import { MarketingFooter } from "@/components/marketing/marketing-footer"
import { MarketingHeader } from "@/components/marketing/marketing-header"
import { MarketingFaq } from "@/components/marketing/marketing-faq"

export const metadata = {
  title: "FAQ — Nula CRM for small business",
  description:
    "Why CRMs fail small business owners and how Nula's AI fixes lead follow-up, sales tracking, messy contacts, and campaigns.",
  alternates: { canonical: "/faq" },
}

export default function FaqPage() {
  return (
    <div className="light flex min-h-svh flex-col bg-nula-paper text-nula-ink">
      <MarketingHeader />
      <main className="flex-1">
        <MarketingFaq />
      </main>
      <MarketingFooter />
    </div>
  )
}
