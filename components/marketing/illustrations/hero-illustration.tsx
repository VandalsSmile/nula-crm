import { cn } from "@/lib/utils"

import type { IllustrationProps } from "./shared"
import {
  ChalkSign,
  DRAWN,
  DrawnSvg,
  GroundLine,
  OwnerMan,
  OwnerWoman,
  PottedPlant,
  ShopBackdrop,
} from "./drawn-style"

/** Two proud shop owners flanking a chalk sign — reference hero scene */
export function HeroIllustration({ className }: IllustrationProps) {
  return (
    <DrawnSvg viewBox="0 0 420 300" className={cn("h-auto w-full max-w-md", className)}>
      <ShopBackdrop x={70} y={28} w={280} h={155} />
      <GroundLine y={248} x1={40} x2={380} />
      <PottedPlant x={44} y={210} />
      <PottedPlant x={352} y={210} />

      <OwnerMan x={58} y={108} pose="wave-right" />
      <OwnerWoman x={278} y={108} pose="wave-left" />

      <ChalkSign x={148} y={168} w={124} h={78} text="CUSTOMERS" subtext="made easy" />

      <path d="M40 252 H380" stroke={DRAWN.line} strokeWidth="0.8" opacity="0.12" />
    </DrawnSvg>
  )
}
