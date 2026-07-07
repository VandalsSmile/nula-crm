import { cn } from "@/lib/utils"

import type { IllustrationProps } from "./shared"
import {
  ChalkSign,
  DRAWN,
  DrawnSvg,
  GroundLine,
  OwnerMan,
  OwnerWoman,
  ShopBackdrop,
} from "./drawn-style"

const INDUSTRIES = [
  { x: 18, label: "Med spa" },
  { x: 108, label: "Wellness" },
  { x: 228, label: "Home svc" },
  { x: 302, label: "Retail" },
]

/** Shop owners with industry tags — light variant for dark sections */
export function WhoItsForIllustration({
  className,
  variant = "light",
}: IllustrationProps & { variant?: "light" | "dark" }) {
  const isDark = variant === "dark"
  const stroke = isDark ? "rgba(255,255,255,0.45)" : DRAWN.line
  const fill = isDark ? "rgba(255,255,255,0.12)" : "white"
  const textFill = isDark ? "rgba(255,255,255,0.85)" : DRAWN.lineSoft

  return (
    <DrawnSvg viewBox="0 0 360 260" className={cn("h-auto w-full", className)} bg="transparent">
      <ShopBackdrop x={88} y={52} w={184} h={118} light={isDark} />
      <GroundLine y={218} x1={20} x2={340} />

      <OwnerMan x={108} y={108} scale={0.82} pose="wave-right" light={isDark} />
      <OwnerWoman x={196} y={108} scale={0.82} pose="wave-left" light={isDark} />

      {INDUSTRIES.map((item) => (
        <g key={item.label} transform={`translate(${item.x} 24)`}>
          <rect x="0" y="0" width="52" height="36" rx="6" stroke={stroke} strokeWidth="1.1" fill={fill} />
          <text x="26" y="22" textAnchor="middle" fill={textFill} fontSize="7" fontFamily="Georgia, serif">
            {item.label}
          </text>
        </g>
      ))}

      <ChalkSign x={108} y={178} w={144} h={52} text="BUILT FOR" subtext="owners like you" light={isDark} />
    </DrawnSvg>
  )
}
