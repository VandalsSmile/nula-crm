import { cn } from "@/lib/utils"

import type { IllustrationProps } from "./shared"
import {
  ChalkSign,
  DRAWN,
  DrawnSvg,
  OwnerMan,
  OwnerWoman,
  PottedPlant,
  ShopBackdrop,
} from "./drawn-style"

/** Two proud shop owners — inspired by the reference "We Are Open" scene */
export function HeroIllustration({ className }: IllustrationProps) {
  return (
    <DrawnSvg viewBox="0 0 420 300" className={cn("h-auto w-full max-w-md", className)}>
      <ShopBackdrop x={70} y={30} w={280} h={150} />
      <PottedPlant x={48} y={200} />
      <PottedPlant x={350} y={200} />

      <OwnerMan x={52} y={108} wave="right" />
      <OwnerWoman x={278} y={108} wave="left" />

      <ChalkSign x={150} y={118} w={120} h={82} text="CUSTOMERS" subtext="made easy" />

      <path d="M40 248 H380" stroke={DRAWN.line} strokeWidth="1" opacity="0.2" />
    </DrawnSvg>
  )
}
