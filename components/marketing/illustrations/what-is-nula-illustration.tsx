import { cn } from "@/lib/utils"

import type { IllustrationProps } from "./shared"
import {
  ChalkSign,
  DRAWN,
  DrawnSvg,
  GroundLine,
  OwnerWoman,
  PottedPlant,
} from "./drawn-style"

/** Owner at the counter — plain language in, organized contacts out */
export function WhatIsNulaIllustration({ className }: IllustrationProps) {
  return (
    <DrawnSvg viewBox="0 0 400 280" className={cn("h-auto w-full", className)}>
      <GroundLine y={228} x1={24} x2={376} />

      {/* Shop counter */}
      <path
        d="M32 168 H368 V196 H32 Z"
        fill={DRAWN.awning}
        stroke={DRAWN.line}
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path d="M32 196 H368" stroke={DRAWN.line} strokeWidth="1.2" opacity="0.25" />

      <PottedPlant x={12} y={168} />
      <OwnerWoman x={48} y={52} scale={0.92} pose="stand" />

      {/* Friendly Nula screen on counter */}
      <g transform="translate(200 72)">
        <rect x="0" y="0" width="156" height="108" rx="10" fill="white" stroke={DRAWN.line} strokeWidth="1.5" />
        <rect x="10" y="10" width="136" height="22" rx="6" fill={DRAWN.dustyBlue} opacity="0.3" />
        <text x="78" y="24" textAnchor="middle" fill={DRAWN.line} fontSize="8" fontFamily="Georgia, serif">
          What do you need?
        </text>
        <rect x="14" y="40" width="108" height="28" rx="8" fill={DRAWN.violet} opacity="0.88" />
        <text x="22" y="52" fill="white" fontSize="7" fontFamily="Georgia, serif">
          Find inactive customers...
        </text>
        <text x="22" y="62" fill="white" fontSize="6.5" fontFamily="Georgia, serif" opacity="0.85">
          and draft a friendly email
        </text>
        <rect
          x="14"
          y="74"
          width="128"
          height="26"
          rx="8"
          fill={DRAWN.signal}
          opacity="0.2"
          stroke={DRAWN.line}
          strokeWidth="1"
        />
        <text x="22" y="86" fill={DRAWN.line} fontSize="7" fontFamily="Georgia, serif">
          ✓ 42 customers found
        </text>
        <text x="22" y="96" fill={DRAWN.lineSoft} fontSize="6" fontFamily="Georgia, serif">
          Ready for your review
        </text>
      </g>

      <ChalkSign x={248} y={168} w={108} h={64} text="Just ask" subtext="plain English" />
    </DrawnSvg>
  )
}
