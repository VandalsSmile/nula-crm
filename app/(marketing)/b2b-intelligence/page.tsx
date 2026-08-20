import { MarketingFooter } from "@/components/marketing/marketing-footer"
import { MarketingHeader } from "@/components/marketing/marketing-header"
import { MarketingB2BIntelligence } from "@/components/marketing/marketing-b2b-intelligence"

export const metadata = {
  title: "B2B Intelligence — Nula CRM",
  description:
    "Turn a name and an email into a qualified prospect. Nula B2B Intelligence auto-fills industry, company size, revenue, and title, scores fit, and recommends the next step — one click, built for B2B small businesses. $49/mo add-on.",
  alternates: { canonical: "/b2b-intelligence" },
}

export default function B2BIntelligencePage() {
  return (
    <div className="light flex min-h-svh flex-col bg-nula-paper text-nula-ink">
      <MarketingHeader />
      <main className="flex-1">
        <MarketingB2BIntelligence />
      </main>
      <MarketingFooter />
    </div>
  )
}
