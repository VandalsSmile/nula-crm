import { cn } from "@/lib/utils"

import type { IllustrationProps } from "./shared"
import { DRAWN, DrawnSvg, OwnerWoman } from "./drawn-style"

/** Messy old CRM vs calm Nula way */
export function WhyNulaIllustration({ className }: IllustrationProps) {
  return (
    <DrawnSvg viewBox="0 0 480 200" className={cn("h-auto w-full max-w-xl mx-auto", className)}>
      {/* Before — tangled mess */}
      <g transform="translate(16 20)">
        <rect width="188" height="160" rx="12" stroke={DRAWN.line} strokeWidth="1.3" fill="white" opacity="0.7" />
        <text x="94" y="22" textAnchor="middle" fill={DRAWN.lineSoft} fontSize="9" fontFamily="Georgia, serif">
          Sound familiar?
        </text>
        <path d="M24 50 C50 70 70 40 100 60 S140 80 164 50" stroke={DRAWN.lineSoft} strokeWidth="1.2" fill="none" opacity="0.5" />
        <path d="M30 80 C60 100 80 60 110 78 S150 95 170 72" stroke={DRAWN.orange} strokeWidth="1" fill="none" opacity="0.4" />
        <path d="M36 110 C70 90 90 120 120 100 S155 85 168 108" stroke={DRAWN.lineSoft} strokeWidth="1" fill="none" opacity="0.4" />
        <rect x="28" y="44" width="48" height="30" rx="4" stroke={DRAWN.line} strokeWidth="1" fill={DRAWN.cream} transform="rotate(-6 52 59)" />
        <rect x="96" y="68" width="48" height="30" rx="4" stroke={DRAWN.line} strokeWidth="1" fill={DRAWN.cream} transform="rotate(8 120 83)" />
        <rect x="52" y="108" width="48" height="30" rx="4" stroke={DRAWN.line} strokeWidth="1" fill={DRAWN.cream} transform="rotate(-4 76 123)" />
        <text x="94" y="148" textAnchor="middle" fill={DRAWN.lineSoft} fontSize="8" fontFamily="Georgia, serif">
          Overwhelming
        </text>
      </g>

      {/* Arrow */}
      <g transform="translate(218 88)">
        <circle cx="22" cy="12" r="18" fill={DRAWN.dustyBlue} opacity="0.25" />
        <path d="M14 12 H30 M22 6 L30 12 L22 18" stroke={DRAWN.line} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </g>

      {/* After — calm with Nula */}
      <g transform="translate(276 20)">
        <rect width="188" height="160" rx="12" stroke={DRAWN.violet} strokeWidth="1.5" fill="white" opacity="0.85" />
        <text x="94" y="22" textAnchor="middle" fill={DRAWN.violet} fontSize="9" fontFamily="Georgia, serif" fontWeight="600">
          With Nula
        </text>
        {[0, 1, 2].map((i) => (
          <g key={i} transform={`translate(20 ${40 + i * 36})`}>
            <rect width="148" height="26" rx="8" fill={DRAWN.cream} stroke={DRAWN.line} strokeWidth="1" opacity="0.8" />
            <circle cx="14" cy="13" r="6" fill={i === 1 ? DRAWN.signal : DRAWN.dustyBlue} opacity={i === 1 ? 0.35 : 0.35} />
            <line x1="28" y1="10" x2="100" y2="10" stroke={DRAWN.lineSoft} strokeWidth="1.5" strokeLinecap="round" opacity="0.35" />
            <line x1="28" y1="18" x2="72" y2="18" stroke={DRAWN.lineSoft} strokeWidth="1" strokeLinecap="round" opacity="0.25" />
            {i === 2 ? (
              <path d="M128 10 L130 12 L134 8" stroke={DRAWN.line} strokeWidth="1.2" strokeLinecap="round" />
            ) : null}
          </g>
        ))}
        <text x="94" y="148" textAnchor="middle" fill={DRAWN.violet} fontSize="8" fontFamily="Georgia, serif">
          Calm &amp; clear
        </text>
      </g>
    </DrawnSvg>
  )
}
