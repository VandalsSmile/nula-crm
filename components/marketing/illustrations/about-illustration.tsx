import { cn } from "@/lib/utils"

import type { IllustrationProps } from "./shared"
import { ChalkSign, DRAWN, DrawnSvg, OwnerMan, OwnerWoman, ShopBackdrop } from "./drawn-style"

/** Small team who built Nula for owners */
export function AboutIllustration({ className }: IllustrationProps) {
  return (
    <DrawnSvg viewBox="0 0 360 240" className={cn("h-auto w-full max-w-sm mx-auto", className)}>
      <ShopBackdrop x={90} y={20} w={180} h={110} />

      <OwnerMan x={72} y={88} scale={0.78} wave="none" />
      <OwnerWoman x={148} y={96} scale={0.72} wave="none" />
      <OwnerMan x={224} y={88} scale={0.78} wave="none" />

      {/* Heart on sign */}
      <ChalkSign x={118} y={36} w={124} h={72} text="MADE FOR" subtext="owners like you" />
      <path
        d="M178 118 C174 112 166 112 166 120 C166 128 178 136 178 136 C178 136 190 128 190 120 C190 112 182 112 178 118Z"
        fill={DRAWN.signal}
        opacity="0.5"
        stroke={DRAWN.line}
        strokeWidth="0.8"
      />

      <text x="180" y="218" textAnchor="middle" fill={DRAWN.lineSoft} fontSize="8" fontFamily="Georgia, serif">
        The Nula team
      </text>
    </DrawnSvg>
  )
}
