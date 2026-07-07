import { cn } from "@/lib/utils"

import type { IllustrationProps } from "./shared"
import { MARKETING_ILLUSTRATIONS, MarketingIllustration } from "./shared"

export function AboutIllustration({ className }: IllustrationProps) {
  return (
    <MarketingIllustration
      src={MARKETING_ILLUSTRATIONS.about}
      alt="The Nula team — built for owners like you"
      className={cn("max-w-sm mx-auto", className)}
    />
  )
}
