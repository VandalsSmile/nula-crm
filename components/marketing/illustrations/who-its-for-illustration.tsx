import { cn } from "@/lib/utils"

import type { IllustrationProps } from "./shared"
import {
  ChalkSign,
  DRAWN,
  DrawnSvg,
  OwnerMan,
  OwnerWoman,
  ShopBackdrop,
} from "./drawn-style"

/** Small business types on a warm shop scene — light variant for dark sections */
export function WhoItsForIllustration({ className, variant = "light" }: IllustrationProps & { variant?: "light" | "dark" }) {
  const isDark = variant === "dark"
  return (
    <DrawnSvg viewBox="0 0 360 260" className={cn("h-auto w-full", className)} bg="transparent">
      <ShopBackdrop x={100} y={24} w={160} h={120} light={isDark} />

      <OwnerMan x={118} y={108} scale={0.85} wave="right" light={isDark} />
      <OwnerWoman x={198} y={108} scale={0.85} wave="left" light={isDark} />

      {[
        { x: 24, label: "Med spa", icon: "✦" },
        { x: 88, label: "Wellness", icon: "+" },
        { x: 248, label: "Home svc", icon: "⌂" },
        { x: 300, label: "Retail", icon: "▣" },
      ].map((sign) => (
        <g key={sign.label} transform={`translate(${sign.x} 36)`}>
          <rect
            x="0"
            y="0"
            width="56"
            height="48"
            rx="4"
            stroke={isDark ? "rgba(255,255,255,0.45)" : DRAWN.line}
            strokeWidth="1.2"
            fill={isDark ? "rgba(255,255,255,0.1)" : "white"}
            opacity="0.9"
          />
          <text
            x="28"
            y="22"
            textAnchor="middle"
            fill={isDark ? "#FFFFFF" : DRAWN.line}
            fontSize="14"
            fontFamily="Georgia, serif"
          >
            {sign.icon}
          </text>
          <text
            x="28"
            y="40"
            textAnchor="middle"
            fill={isDark ? "rgba(255,255,255,0.75)" : DRAWN.lineSoft}
            fontSize="7"
            fontFamily="Georgia, serif"
          >
            {sign.label}
          </text>
        </g>
      ))}

      <ChalkSign x={108} y={188} w={144} h={56} text="BUILT FOR" subtext="owners like you" light={isDark} />
    </DrawnSvg>
  )
}
