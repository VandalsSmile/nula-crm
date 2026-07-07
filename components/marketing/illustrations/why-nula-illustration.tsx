import { cn } from "@/lib/utils"

import type { IllustrationProps } from "./shared"
import { DRAWN, DrawnSvg, OwnerWoman } from "./drawn-style"

/** Messy old CRM vs calm Nula — side-by-side comparison */
export function WhyNulaIllustration({ className }: IllustrationProps) {
  return (
    <DrawnSvg viewBox="0 0 480 220" className={cn("h-auto w-full max-w-xl mx-auto", className)}>
      {/* Before — tangled mess */}
      <g transform="translate(12 16)">
        <rect width="196" height="172" rx="14" stroke={DRAWN.lineSoft} strokeWidth="1.2" fill="white" opacity="0.75" />
        <text x="98" y="24" textAnchor="middle" fill={DRAWN.lineSoft} fontSize="9" fontFamily="Georgia, serif">
          Sound familiar?
        </text>
        <path d="M28 52 C58 72 78 42 108 62 S148 82 168 52" stroke={DRAWN.lineSoft} strokeWidth="1.2" fill="none" opacity="0.45" />
        <path d="M34 82 C64 102 84 62 114 80 S154 98 174 74" stroke={DRAWN.orange} strokeWidth="1" fill="none" opacity="0.35" />
        <rect x="30" y="46" width="50" height="32" rx="4" stroke={DRAWN.line} strokeWidth="1" fill={DRAWN.cream} transform="rotate(-5 55 62)" />
        <rect x="98" y="70" width="50" height="32" rx="4" stroke={DRAWN.line} strokeWidth="1" fill={DRAWN.cream} transform="rotate(7 123 86)" />
        <rect x="54" y="110" width="50" height="32" rx="4" stroke={DRAWN.line} strokeWidth="1" fill={DRAWN.cream} transform="rotate(-3 79 126)" />
        <text x="98" y="156" textAnchor="middle" fill={DRAWN.lineSoft} fontSize="8" fontFamily="Georgia, serif">
          Overwhelming
        </text>
      </g>

      {/* Arrow */}
      <g transform="translate(220 92)">
        <circle cx="20" cy="10" r="18" fill={DRAWN.dustyBlue} opacity="0.22" />
        <path
          d="M12 10 H28 M20 4 L28 10 L20 16"
          stroke={DRAWN.line}
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>

      {/* After — calm with Nula */}
      <g transform="translate(272 16)">
        <rect width="196" height="172" rx="14" stroke={DRAWN.violet} strokeWidth="1.5" fill="white" opacity="0.9" />
        <text x="98" y="24" textAnchor="middle" fill={DRAWN.violet} fontSize="9" fontFamily="Georgia, serif" fontWeight="600">
          With Nula
        </text>
        {[0, 1, 2].map((i) => (
          <g key={i} transform={`translate(22 ${42 + i * 34})`}>
            <rect width="152" height="28" rx="8" fill={DRAWN.cream} stroke={DRAWN.line} strokeWidth="1" opacity="0.85" />
            <circle cx="14" cy="14" r="6" fill={i === 1 ? DRAWN.signal : DRAWN.dustyBlue} opacity="0.35" />
            <line x1="30" y1="11" x2="108" y2="11" stroke={DRAWN.lineSoft} strokeWidth="1.4" strokeLinecap="round" opacity="0.3" />
            <line x1="30" y1="19" x2="76" y2="19" stroke={DRAWN.lineSoft} strokeWidth="1" strokeLinecap="round" opacity="0.22" />
            {i === 2 ? (
              <path d="M136 11 L138 13 L142 9" stroke={DRAWN.line} strokeWidth="1.2" strokeLinecap="round" />
            ) : null}
          </g>
        ))}
        <text x="98" y="156" textAnchor="middle" fill={DRAWN.violet} fontSize="8" fontFamily="Georgia, serif">
          Calm &amp; clear
        </text>
      </g>

      <OwnerWoman x={392} y={108} scale={0.55} pose="wave-right" />
    </DrawnSvg>
  )
}
