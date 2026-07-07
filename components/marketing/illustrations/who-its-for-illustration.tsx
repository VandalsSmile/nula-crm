import { cn } from "@/lib/utils"

import type { IllustrationProps } from "./shared"
import { MARKETING_ILLUSTRATIONS, MarketingIllustration } from "./shared"

export function WhoItsForIllustration({
  className,
  variant = "light",
}: IllustrationProps & { variant?: "light" | "dark" }) {
  return (
    <MarketingIllustration
      src={MARKETING_ILLUSTRATIONS.whoItsFor}
      alt="Small business owners representing med spa, wellness, home services, and retail"
      className={cn(variant === "dark" ? "rounded-2xl" : undefined, className)}
    />
  )
}
