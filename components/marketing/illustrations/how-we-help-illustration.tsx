import { cn } from "@/lib/utils"

import type { IllustrationProps } from "./shared"
import { ChalkSign, DRAWN, DrawnSvg, OwnerWoman, PottedPlant } from "./drawn-style"

/** Owner welcoming a happy customer */
export function HowWeHelpIllustration({ className }: IllustrationProps) {
  return (
    <DrawnSvg viewBox="0 0 380 280" className={cn("h-auto w-full", className)}>
      <path d="M30 230 H350" stroke={DRAWN.line} strokeWidth="1" opacity="0.2" />
      <PottedPlant x={20} y={198} />
      <PottedPlant x={330} y={198} />

      {/* Shop owner */}
      <OwnerWoman x={200} y={72} scale={0.9} wave="left" />

      {/* Happy customer (simpler figure) */}
      <g transform="translate(72 100)">
        <ellipse cx="32" cy="108" rx="24" ry="4" fill={DRAWN.line} opacity="0.08" />
        <path d="M18 72 H46 V108 H18 Z" fill={DRAWN.orange} stroke={DRAWN.line} strokeWidth="1.2" />
        <path d="M16 78 H48 V108 H16 Z" fill={DRAWN.dustyBlue} stroke={DRAWN.line} strokeWidth="1.2" opacity="0.6" />
        <path d="M20 88 L12 102" stroke={DRAWN.skin} strokeWidth="7" strokeLinecap="round" />
        <path d="M44 88 L52 102" stroke={DRAWN.skin} strokeWidth="7" strokeLinecap="round" />
        <path d="M18 108 L14 128 H26 L30 108 Z" fill={DRAWN.brown} stroke={DRAWN.line} strokeWidth="1" />
        <path d="M34 108 L38 128 H50 L46 108 Z" fill={DRAWN.brown} stroke={DRAWN.line} strokeWidth="1" />
        <circle cx="32" cy="36" r="16" fill={DRAWN.skin} stroke={DRAWN.line} strokeWidth="1.2" />
        <path d="M18 28 Q32 14 46 28" fill={DRAWN.hair} stroke={DRAWN.line} strokeWidth="1" />
        <ellipse cx="24" cy="38" rx="3" ry="3.5" fill={DRAWN.blush} opacity="0.5" />
        <ellipse cx="40" cy="38" rx="3" ry="3.5" fill={DRAWN.blush} opacity="0.5" />
        <circle cx="27" cy="35" r="1.8" fill={DRAWN.line} />
        <circle cx="37" cy="35" r="1.8" fill={DRAWN.line} />
        <path d="M28 42 Q32 46 36 42" stroke={DRAWN.line} strokeWidth="1.3" strokeLinecap="round" fill="none" />
      </g>

      {/* Connection hearts */}
      <path d="M108 148 Q150 130 190 148" stroke={DRAWN.line} strokeWidth="1" strokeDasharray="4 4" opacity="0.3" />
      <path
        d="M148 138 C144 132 136 132 136 140 C136 148 148 156 148 156 C148 156 160 148 160 140 C160 132 152 132 148 138Z"
        fill={DRAWN.signal}
        opacity="0.45"
        stroke={DRAWN.line}
        strokeWidth="0.8"
      />

      <ChalkSign x={118} y={178} w={144} h={72} text="YOU SELL" subtext="we handle the rest" />
    </DrawnSvg>
  )
}
