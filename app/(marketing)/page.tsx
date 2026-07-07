import { MarketingFooter } from "@/components/marketing/marketing-footer"
import { MarketingHeader } from "@/components/marketing/marketing-header"
import { MarketingHome } from "@/components/marketing/marketing-home"
import { MarketingJsonLd } from "@/components/marketing/marketing-json-ld"

export default function HomePage() {
  return (
    <div className="flex min-h-svh flex-col bg-nula-paper">
      <MarketingJsonLd />
      <MarketingHeader />
      <main className="flex-1">
        <MarketingHome />
      </main>
      <MarketingFooter />
    </div>
  )
}
