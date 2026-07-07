import { cn } from "@/lib/utils"

import type { IllustrationProps } from "./shared"
import { MARKETING_ILLUSTRATIONS, MarketingIllustration } from "./shared"

export function HowWeHelpIllustration({ className }: IllustrationProps) {
  return (
    <MarketingIllustration
      src={MARKETING_ILLUSTRATIONS.howWeHelp}
      alt="Shop owner shaking hands with a customer — you sell, Nula handles the rest"
      className={className}
    />
  )
}
