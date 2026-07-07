import { cn } from "@/lib/utils"

import type { IllustrationProps } from "./shared"
import {
  ChalkSign,
  DRAWN,
  DrawnSvg,
  GroundLine,
  HeartAccent,
  OwnerMan,
  OwnerWoman,
  ShopBackdrop,
} from "./drawn-style"

/** The two founders who built Nula for small business owners */
export function AboutIllustration({ className }: IllustrationProps) {
  return (
    <DrawnSvg viewBox="0 0 360 240" className={cn("h-auto w-full max-w-sm mx-auto", className)}>
      <ShopBackdrop x={70} y={16} w={220} h={120} />
      <GroundLine y={208} x1={30} x2={330} />

      <OwnerMan x={72} y={72} scale={0.82} pose="stand" />
      <OwnerWoman x={196} y={76} scale={0.82} pose="stand" />

      <ChalkSign x={108} y={28} w={144} h={64} text="MADE FOR" subtext="owners like you" />
      <HeartAccent x={172} y={118} size={12} />

      <text x="180" y="226" textAnchor="middle" fill={DRAWN.lineSoft} fontSize="8" fontFamily="Georgia, serif">
        The Nula team
      </text>
    </DrawnSvg>
  )
}
