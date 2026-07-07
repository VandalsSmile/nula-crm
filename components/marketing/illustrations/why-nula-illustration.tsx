import { cn } from "@/lib/utils"

import type { IllustrationProps } from "./shared"
import { MARKETING_ILLUSTRATIONS, MarketingIllustration } from "./shared"

export function WhyNulaIllustration({ className }: IllustrationProps) {
  return (
    <MarketingIllustration
      src={MARKETING_ILLUSTRATIONS.whyNula}
      alt="Comparison of overwhelming CRM chaos versus calm and clear workflow with Nula"
      className={cn("max-w-3xl", className)}
    />
  )
}
