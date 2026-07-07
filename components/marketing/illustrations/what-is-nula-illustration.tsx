import { cn } from "@/lib/utils"

import type { IllustrationProps } from "./shared"
import { MARKETING_ILLUSTRATIONS, MarketingIllustration } from "./shared"

export function WhatIsNulaIllustration({ className }: IllustrationProps) {
  return (
    <MarketingIllustration
      src={MARKETING_ILLUSTRATIONS.whatIsNula}
      alt="Shop owner asking Nula for help in plain English at the counter"
      className={className}
    />
  )
}
