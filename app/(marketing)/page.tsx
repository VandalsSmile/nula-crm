import { MarketingFooter } from "@/components/marketing/marketing-footer"
import { MarketingHeader } from "@/components/marketing/marketing-header"
import { MarketingHome } from "@/components/marketing/marketing-home"

export default function HomePage() {
  return (
    <div className="flex min-h-svh flex-col bg-nula-paper">
      <MarketingHeader />
      <main className="flex-1">
        <MarketingHome />
      </main>
      <MarketingFooter />
    </div>
  )
}
