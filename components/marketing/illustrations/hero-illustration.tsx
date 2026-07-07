import { cn } from "@/lib/utils"

import type { IllustrationProps } from "./shared"
import { MARKETING_ILLUSTRATIONS, MarketingIllustration } from "./shared"

export function HeroIllustration({ className }: IllustrationProps) {
  return (
    <MarketingIllustration
      src={MARKETING_ILLUSTRATIONS.hero}
      alt="Two small business owners welcoming customers outside their shop"
      className={cn("max-w-md", className)}
      priority
    />
  )
}
