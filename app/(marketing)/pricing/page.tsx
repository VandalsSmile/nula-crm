import { MarketingFooter } from "@/components/marketing/marketing-footer"
import { MarketingHeader } from "@/components/marketing/marketing-header"
import { MarketingPricing } from "@/components/marketing/marketing-pricing"

export const metadata = {
  title: "Pricing — Nula CRM",
  description:
    "One simple price for everyone — AI included. No tiers, no contracts. Try Nula free for 14 days, no credit card required.",
  alternates: { canonical: "/pricing" },
}

export default function PricingPage() {
  return (
    <div className="light flex min-h-svh flex-col bg-nula-paper text-nula-ink">
      <MarketingHeader />
      <main className="flex-1">
        <MarketingPricing />
      </main>
      <MarketingFooter />
    </div>
  )
}
