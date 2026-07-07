import { cn } from "@/lib/utils"

import type { IllustrationProps } from "./shared"
import { ChalkSign, DRAWN, DrawnSvg, OwnerWoman, PottedPlant } from "./drawn-style"

/** Owner chatting with Nula — plain language in, organized contacts out */
export function WhatIsNulaIllustration({ className }: IllustrationProps) {
  return (
    <DrawnSvg viewBox="0 0 400 280" className={cn("h-auto w-full", className)}>
      {/* Counter / desk line art */}
      <path
        d="M40 200 H360"
        stroke={DRAWN.line}
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.35"
      />
      <rect x="48" y="168" width="120" height="32" rx="4" stroke={DRAWN.line} strokeWidth="1.3" fill={DRAWN.cream} />
      <line x1="56" y1="180" x2="108" y2="180" stroke={DRAWN.lineSoft} strokeWidth="1" opacity="0.5" />
      <line x1="56" y1="188" x2="92" y2="188" stroke={DRAWN.lineSoft} strokeWidth="1" opacity="0.4" />

      <OwnerWoman x={56} y={52} scale={0.95} wave="none" />

      {/* Friendly tablet / screen */}
      <g transform="translate(220 72)">
        <rect x="0" y="0" width="140" height="100" rx="8" fill="white" stroke={DRAWN.line} strokeWidth="1.5" />
        <rect x="8" y="8" width="124" height="18" rx="4" fill={DRAWN.dustyBlue} opacity="0.35" />
        <text x="70" y="20" textAnchor="middle" fill={DRAWN.line} fontSize="7" fontFamily="Georgia, serif">
          What do you need?
        </text>
        <rect x="12" y="34" width="96" height="22" rx="6" fill={DRAWN.violet} opacity="0.85" />
        <text x="20" y="44" fill="white" fontSize="6" fontFamily="Georgia, serif">
          Find inactive
        </text>
        <text x="20" y="52" fill="white" fontSize="6" fontFamily="Georgia, serif" opacity="0.8">
          customers...
        </text>
        <rect x="12" y="62" width="108" height="28" rx="6" fill={DRAWN.signal} opacity="0.25" stroke={DRAWN.line} strokeWidth="1" />
        <text x="20" y="74" fill={DRAWN.line} fontSize="6" fontFamily="Georgia, serif">
          ✓ 42 found
        </text>
        <text x="20" y="84" fill={DRAWN.lineSoft} fontSize="5.5" fontFamily="Georgia, serif">
          Ready for you
        </text>
      </g>

      <ChalkSign x={248} y={178} w={100} h={68} text="Just ask" subtext="in plain English" />
      <PottedPlant x={12} y={168} />
    </DrawnSvg>
  )
}
