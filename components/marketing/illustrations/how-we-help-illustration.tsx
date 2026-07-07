import { cn } from "@/lib/utils"

import type { IllustrationProps } from "./shared"
import {
  ChalkSign,
  Customer,
  DrawnSvg,
  GroundLine,
  HeartAccent,
  OwnerWoman,
  PottedPlant,
  ShopBackdrop,
} from "./drawn-style"

/** Owner welcoming a customer outside the shop */
export function HowWeHelpIllustration({ className }: IllustrationProps) {
  return (
    <DrawnSvg viewBox="0 0 400 280" className={cn("h-auto w-full", className)}>
      <ShopBackdrop x={80} y={20} w={240} h={130} />
      <GroundLine y={228} x1={20} x2={380} />
      <PottedPlant x={16} y={192} />
      <PottedPlant x={348} y={192} />

      <Customer x={48} y={88} scale={0.88} />
      <OwnerWoman x={268} y={88} scale={0.88} pose="wave-left" />

      <HeartAccent x={188} y={108} size={16} opacity={0.55} />
      <path
        d="M120 130 Q200 118 280 130"
        stroke="#3D3028"
        strokeWidth="1"
        strokeDasharray="5 5"
        opacity="0.2"
        fill="none"
      />

      <ChalkSign x={128} y={178} w={144} h={68} text="YOU SELL" subtext="we handle the rest" />
    </DrawnSvg>
  )
}
