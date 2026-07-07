"use client"

import { useId, type ReactNode } from "react"

/** Warm hand-drawn palette inspired by small-business shop art */
export const DRAWN = {
  cream: "#FAF7F0",
  line: "#3D3028",
  lineSoft: "#6B5C4F",
  skin: "#F0C9A8",
  blush: "#E8A898",
  hair: "#5C4030",
  beard: "#6B4C38",
  dustyBlue: "#7A9BB5",
  orange: "#E8915A",
  mustard: "#E8B84A",
  brown: "#5C4A3D",
  yellow: "#F2D56B",
  straw: "#D4B896",
  chalk: "#2A2420",
  chalkText: "#FAF7F0",
  plant: "#8BA888",
  pot: "#C4A882",
  violet: "#6B5FD4",
  signal: "#4ECDB0",
} as const

function DrawnDefs({ grainId }: { grainId: string }) {
  return (
    <defs>
      <filter id={grainId} x="0%" y="0%" width="100%" height="100%">
        <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="4" stitchTiles="stitch" result="noise" />
        <feColorMatrix type="saturate" values="0" in="noise" result="gray" />
        <feBlend in="SourceGraphic" in2="gray" mode="multiply" result="blend" />
        <feComponentTransfer in="blend">
          <feFuncA type="linear" slope="0.06" />
        </feComponentTransfer>
      </filter>
    </defs>
  )
}

export function DrawnSvg({
  children,
  viewBox,
  className,
  grain = true,
  bg = "cream",
}: {
  children: ReactNode
  viewBox: string
  className?: string
  grain?: boolean
  bg?: "cream" | "transparent"
}) {
  const uid = useId().replace(/:/g, "")
  const grainId = `nula-grain-${uid}`

  return (
    <svg
      viewBox={viewBox}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
      style={grain ? { filter: `url(#${grainId})` } : undefined}
    >
      <DrawnDefs grainId={grainId} />
      {bg === "cream" ? <rect width="100%" height="100%" fill={DRAWN.cream} /> : null}
      {children}
    </svg>
  )
}

/** Simple line-art storefront backdrop */
export function ShopBackdrop({ x = 60, y = 40, w = 280, h = 160, light = false }: { x?: number; y?: number; w?: number; h?: number; light?: boolean }) {
  const stroke = light ? "rgba(255,255,255,0.55)" : DRAWN.line
  return (
    <g opacity={light ? 0.7 : 0.55}>
      <path
        d={`M${x} ${y + h} V${y + 50} L${x + w / 2} ${y + 18} L${x + w} ${y + 50} V${y + h}`}
        stroke={stroke}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <rect x={x + 28} y={y + 78} width={44} height={58} rx="2" stroke={stroke} strokeWidth="1.5" />
      <line x1={x + 50} y1={y + 78} x2={x + 50} y2={y + 136} stroke={stroke} strokeWidth="1" />
      <rect x={x + w - 72} y={y + 78} width={44} height={36} rx="2" stroke={stroke} strokeWidth="1.5" />
      <path d={`M${x - 20} ${y + h} Q${x - 8} ${y + 90} ${x + 4} ${y + h}`} stroke={stroke} strokeWidth="1.2" />
      <path d={`M${x + w + 4} ${y + h} Q${x + w + 16} ${y + 88} ${x + w + 28} ${y + h}`} stroke={stroke} strokeWidth="1.2" />
      <ellipse cx={x + w / 2} cy={y + 42} rx="5" ry="3" stroke={stroke} strokeWidth="1.2" />
    </g>
  )
}

/** Chalkboard A-frame sign */
export function ChalkSign({
  x,
  y,
  w = 120,
  h = 88,
  text,
  subtext,
  light = false,
}: {
  x: number
  y: number
  w?: number
  h?: number
  text: string
  subtext?: string
  light?: boolean
}) {
  const leg = 14
  const board = light ? "rgba(255,255,255,0.15)" : DRAWN.chalk
  const textColor = light ? "#FFFFFF" : DRAWN.chalkText
  const legColor = light ? "rgba(255,255,255,0.35)" : DRAWN.brown

  return (
    <g>
      <path d={`M${x} ${y + h} L${x + leg} ${y + h + 28} H${x + w - leg} L${x + w} ${y + h} Z`} fill={legColor} />
      <path
        d={`M${x + 6} ${y + 8} H${x + w - 6} Q${x + w} ${y + 8} ${x + w} ${y + 16} V${y + h - 4} Q${x + w} ${y + h} ${x + w - 6} ${y + h} H${x + 6} Q${x} ${y + h} ${x} ${y + h - 4} V${y + 16} Q${x} ${y + 8} ${x + 6} ${y + 8} Z`}
        fill={board}
        stroke={light ? "rgba(255,255,255,0.4)" : DRAWN.line}
        strokeWidth="1.5"
      />
      <text
        x={x + w / 2}
        y={y + h / 2 - (subtext ? 6 : 0)}
        textAnchor="middle"
        fill={textColor}
        fontSize="11"
        fontWeight="600"
        fontFamily="Georgia, serif"
        style={{ letterSpacing: "0.04em" }}
      >
        {text}
      </text>
      {subtext ? (
        <text
          x={x + w / 2}
          y={y + h / 2 + 14}
          textAnchor="middle"
          fill={textColor}
          fontSize="8"
          opacity="0.8"
          fontFamily="Georgia, serif"
        >
          {subtext}
        </text>
      ) : null}
    </g>
  )
}

/** Male shop owner — straw hat, orange shirt, blue apron */
export function OwnerMan({
  x,
  y,
  scale = 1,
  wave = "left",
  light = false,
}: {
  x: number
  y: number
  scale?: number
  wave?: "left" | "right" | "none"
  light?: boolean
}) {
  const line = light ? "#FFFFFF" : DRAWN.line
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`} opacity={light ? 0.95 : 1}>
      <ellipse cx="36" cy="118" rx="28" ry="5" fill={line} opacity="0.08" />
      <path d="M22 88 L18 118 H30 L34 88 Z" fill={DRAWN.brown} stroke={line} strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M38 88 L42 118 H54 L50 88 Z" fill={DRAWN.brown} stroke={line} strokeWidth="1.2" strokeLinejoin="round" />
      <ellipse cx="24" cy="118" rx="8" ry="4" fill={DRAWN.yellow} stroke={line} strokeWidth="1" />
      <ellipse cx="46" cy="118" rx="8" ry="4" fill={DRAWN.yellow} stroke={line} strokeWidth="1" />
      <path d="M18 52 H54 V88 H18 Z" fill={DRAWN.orange} stroke={line} strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M16 58 H56 V90 H16 Z" fill={DRAWN.dustyBlue} stroke={line} strokeWidth="1.3" strokeLinejoin="round" />
      <rect x="28" y="68" width="16" height="14" rx="2" fill={DRAWN.dustyBlue} stroke={line} strokeWidth="1" opacity="0.5" />
      {wave === "left" ? (
        <path d="M14 62 Q-2 50 4 38" stroke={DRAWN.skin} strokeWidth="9" strokeLinecap="round" fill="none" />
      ) : wave === "right" ? (
        <path d="M58 62 Q72 50 66 38" stroke={DRAWN.skin} strokeWidth="9" strokeLinecap="round" fill="none" />
      ) : (
        <path d="M14 68 L6 82" stroke={DRAWN.skin} strokeWidth="8" strokeLinecap="round" />
      )}
      <circle cx="36" cy="34" r="18" fill={DRAWN.skin} stroke={line} strokeWidth="1.3" />
      <path d="M20 30 Q36 8 52 30" fill={DRAWN.straw} stroke={line} strokeWidth="1.2" />
      <ellipse cx="36" cy="14" rx="16" ry="5" fill={DRAWN.straw} stroke={line} strokeWidth="1" />
      <ellipse cx="28" cy="36" rx="3.5" ry="4" fill={DRAWN.blush} opacity="0.55" />
      <ellipse cx="44" cy="36" rx="3.5" ry="4" fill={DRAWN.blush} opacity="0.55" />
      <circle cx="30" cy="32" r="2" fill={line} />
      <circle cx="42" cy="32" r="2" fill={line} />
      <path d="M32 40 Q36 44 40 40" stroke={line} strokeWidth="1.5" strokeLinecap="round" fill="none" />
      <path d="M26 38 Q30 42 34 40" fill={DRAWN.beard} opacity="0.7" />
      <path d="M38 38 Q42 42 46 40" fill={DRAWN.beard} opacity="0.7" />
    </g>
  )
}

/** Female shop owner — glasses, mustard shirt, blue apron */
export function OwnerWoman({
  x,
  y,
  scale = 1,
  wave = "right",
  light = false,
}: {
  x: number
  y: number
  scale?: number
  wave?: "left" | "right" | "none"
  light?: boolean
}) {
  const line = light ? "#FFFFFF" : DRAWN.line
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`} opacity={light ? 0.95 : 1}>
      <ellipse cx="36" cy="118" rx="28" ry="5" fill={line} opacity="0.08" />
      <path d="M22 88 L18 118 H30 L34 88 Z" fill={DRAWN.brown} stroke={line} strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M38 88 L42 118 H54 L50 88 Z" fill={DRAWN.brown} stroke={line} strokeWidth="1.2" strokeLinejoin="round" />
      <ellipse cx="24" cy="118" rx="8" ry="4" fill={DRAWN.yellow} stroke={line} strokeWidth="1" />
      <ellipse cx="46" cy="118" rx="8" ry="4" fill={DRAWN.yellow} stroke={line} strokeWidth="1" />
      <path d="M18 52 H54 V88 H18 Z" fill={DRAWN.mustard} stroke={line} strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M16 58 H56 V90 H16 Z" fill={DRAWN.dustyBlue} stroke={line} strokeWidth="1.3" strokeLinejoin="round" />
      <rect x="28" y="68" width="16" height="14" rx="2" fill={DRAWN.dustyBlue} stroke={line} strokeWidth="1" opacity="0.5" />
      {wave === "right" ? (
        <path d="M58 62 Q74 48 68 36" stroke={DRAWN.skin} strokeWidth="9" strokeLinecap="round" fill="none" />
      ) : wave === "left" ? (
        <path d="M14 62 Q-2 48 6 36" stroke={DRAWN.skin} strokeWidth="9" strokeLinecap="round" fill="none" />
      ) : (
        <path d="M58 68 L66 82" stroke={DRAWN.skin} strokeWidth="8" strokeLinecap="round" />
      )}
      <circle cx="36" cy="34" r="18" fill={DRAWN.skin} stroke={line} strokeWidth="1.3" />
      <path d="M20 22 Q36 6 52 22 L50 36 Q36 28 22 36 Z" fill={DRAWN.hair} stroke={line} strokeWidth="1.2" />
      <ellipse cx="28" cy="36" rx="3.5" ry="4" fill={DRAWN.blush} opacity="0.55" />
      <ellipse cx="44" cy="36" rx="3.5" ry="4" fill={DRAWN.blush} opacity="0.55" />
      <circle cx="30" cy="32" r="2" fill={line} />
      <circle cx="42" cy="32" r="2" fill={line} />
      <path d="M32 40 Q36 44 40 40" stroke={line} strokeWidth="1.5" strokeLinecap="round" fill="none" />
      <circle cx="30" cy="32" r="5" fill="none" stroke={line} strokeWidth="1.2" />
      <circle cx="42" cy="32" r="5" fill="none" stroke={line} strokeWidth="1.2" />
      <line x1="35" y1="32" x2="37" y2="32" stroke={line} strokeWidth="1" />
    </g>
  )
}

/** Potted plant accent */
export function PottedPlant({ x, y, light = false }: { x: number; y: number; light?: boolean }) {
  const line = light ? "rgba(255,255,255,0.5)" : DRAWN.line
  return (
    <g transform={`translate(${x} ${y})`}>
      <path d="M8 28 H24 V36 H8 Z" fill={DRAWN.pot} stroke={line} strokeWidth="1.2" />
      <path d="M6 36 H26 V40 H6 Z" fill={DRAWN.pot} stroke={line} strokeWidth="1" />
      <path d="M16 28 Q10 18 14 10 Q16 20 16 28" fill={DRAWN.plant} stroke={line} strokeWidth="1" />
      <path d="M16 28 Q22 16 20 8 Q18 18 16 28" fill={DRAWN.plant} stroke={line} strokeWidth="1" />
      <path d="M16 28 Q16 14 16 6" stroke={DRAWN.plant} strokeWidth="1.5" strokeLinecap="round" />
    </g>
  )
}
