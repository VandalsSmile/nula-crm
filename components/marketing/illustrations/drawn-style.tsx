import type { ReactNode } from "react"

/** Warm hand-drawn palette — shop-owner illustration style */
export const DRAWN = {
  cream: "#FAF7F0",
  line: "#3D3028",
  lineSoft: "#6B5C4F",
  skin: "#F0C9A8",
  skinShadow: "#E0B898",
  blush: "#E8A898",
  hair: "#5C4030",
  beard: "#6B4C38",
  dustyBlue: "#7A9BB5",
  dustyBlueDark: "#5A7A95",
  orange: "#E8915A",
  mustard: "#E8B84A",
  brown: "#5C4A3D",
  yellow: "#F2D56B",
  straw: "#D4B896",
  chalk: "#2A2420",
  chalkText: "#FAF7F0",
  plant: "#8BA888",
  plantDark: "#6B9070",
  pot: "#C4A882",
  violet: "#6B5FD4",
  signal: "#4ECDB0",
  awning: "#E8DFD0",
} as const

const FONT = "Georgia, 'Times New Roman', serif"

function viewBoxSize(viewBox: string) {
  const parts = viewBox.trim().split(/\s+/).map(Number)
  return { width: parts[2] ?? 400, height: parts[3] ?? 300 }
}

export function DrawnSvg({
  children,
  viewBox,
  className,
  bg = "cream",
}: {
  children: ReactNode
  viewBox: string
  className?: string
  bg?: "cream" | "transparent"
}) {
  const { width, height } = viewBoxSize(viewBox)

  return (
    <svg
      viewBox={viewBox}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
      role="img"
    >
      {bg === "cream" ? <rect width={width} height={height} fill={DRAWN.cream} /> : null}
      {children}
    </svg>
  )
}

export function GroundLine({ y = 230, x1 = 24, x2 = 376 }: { y?: number; x1?: number; x2?: number }) {
  return (
    <path
      d={`M${x1} ${y} Q${(x1 + x2) / 2} ${y + 2} ${x2} ${y}`}
      stroke={DRAWN.line}
      strokeWidth="1.2"
      strokeLinecap="round"
      opacity="0.18"
    />
  )
}

/** Warm storefront with awning — reference shop scene */
export function ShopBackdrop({
  x = 60,
  y = 40,
  w = 280,
  h = 160,
  light = false,
}: {
  x?: number
  y?: number
  w?: number
  h?: number
  light?: boolean
}) {
  const stroke = light ? "rgba(255,255,255,0.5)" : DRAWN.line
  const fill = light ? "rgba(255,255,255,0.08)" : DRAWN.awning
  const peak = y + 22

  return (
    <g opacity={light ? 0.75 : 0.6}>
      {/* Awning stripes */}
      <path
        d={`M${x - 8} ${y + 52} L${x + w / 2} ${peak} L${x + w + 8} ${y + 52} V${y + 68} L${x - 8} ${y + 68} Z`}
        fill={fill}
        stroke={stroke}
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      {[0, 1, 2, 3, 4].map((i) => (
        <line
          key={i}
          x1={x + 20 + i * (w / 5)}
          y1={y + 54}
          x2={x + w / 2 + (i - 2) * 18}
          y2={peak + 4}
          stroke={stroke}
          strokeWidth="0.8"
          opacity="0.35"
        />
      ))}
      {/* Building */}
      <path
        d={`M${x} ${y + 68} V${y + h} H${x + w} V${y + 68}`}
        stroke={stroke}
        strokeWidth="1.5"
        strokeLinejoin="round"
        fill={light ? "transparent" : "white"}
        fillOpacity={light ? 0 : 0.4}
      />
      {/* Door */}
      <path
        d={`M${x + w / 2 - 22} ${y + 68} V${y + h} H${x + w / 2 + 22} V${y + 68}`}
        stroke={stroke}
        strokeWidth="1.3"
        fill={light ? "rgba(255,255,255,0.06)" : DRAWN.cream}
      />
      <circle cx={x + w / 2 + 14} cy={y + h - 28} r="2" fill={stroke} />
      {/* Windows */}
      <rect x={x + 24} y={y + 88} width={38} height={42} rx="2" stroke={stroke} strokeWidth="1.3" fill={light ? "rgba(255,255,255,0.1)" : "#FFF8EE"} />
      <line x1={x + 43} y1={y + 88} x2={x + 43} y2={y + 130} stroke={stroke} strokeWidth="0.8" opacity="0.5" />
      <line x1={x + 24} y1={y + 109} x2={x + 62} y2={y + 109} stroke={stroke} strokeWidth="0.8" opacity="0.5" />
      <rect x={x + w - 62} y={y + 88} width={38} height={42} rx="2" stroke={stroke} strokeWidth="1.3" fill={light ? "rgba(255,255,255,0.1)" : "#FFF8EE"} />
      {/* Planters at base */}
      <path d={`M${x - 14} ${y + h} Q${x - 4} ${y + h - 18} ${x + 6} ${y + h}`} stroke={stroke} strokeWidth="1.1" />
      <path d={`M${x + w - 6} ${y + h} Q${x + w + 4} ${y + h - 18} ${x + w + 14} ${y + h}`} stroke={stroke} strokeWidth="1.1" />
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
  const leg = 12
  const board = light ? "rgba(255,255,255,0.18)" : DRAWN.chalk
  const textColor = light ? "#FFFFFF" : DRAWN.chalkText
  const legColor = light ? "rgba(255,255,255,0.35)" : DRAWN.brown

  return (
    <g>
      <path d={`M${x + 4} ${y + h} L${x + leg} ${y + h + 24} H${x + w - leg} L${x + w - 4} ${y + h} Z`} fill={legColor} />
      <path
        d={`M${x + 4} ${y + 10} H${x + w - 4} Q${x + w + 2} ${y + 10} ${x + w} ${y + 18} V${y + h - 6} Q${x + w - 2} ${y + h} ${x + w - 6} ${y + h} H${x + 6} Q${x} ${y + h} ${x + 2} ${y + h - 6} V${y + 18} Q${x + 2} ${y + 10} ${x + 4} ${y + 10} Z`}
        fill={board}
        stroke={light ? "rgba(255,255,255,0.45)" : DRAWN.line}
        strokeWidth="1.4"
      />
      <text
        x={x + w / 2}
        y={y + h / 2 - (subtext ? 5 : 2)}
        textAnchor="middle"
        fill={textColor}
        fontSize="11"
        fontWeight="600"
        fontFamily={FONT}
        style={{ letterSpacing: "0.06em" }}
      >
        {text}
      </text>
      {subtext ? (
        <text
          x={x + w / 2}
          y={y + h / 2 + 13}
          textAnchor="middle"
          fill={textColor}
          fontSize="7.5"
          opacity="0.85"
          fontFamily={FONT}
          fontStyle="italic"
        >
          {subtext}
        </text>
      ) : null}
    </g>
  )
}

type Pose = "wave-left" | "wave-right" | "stand"

function CharacterShadow({ light }: { light?: boolean }) {
  const fill = light ? "#FFFFFF" : DRAWN.line
  return <ellipse cx="36" cy="118" rx="24" ry="4" fill={fill} opacity="0.1" />
}

function CharacterLegs({ line }: { line: string }) {
  return (
    <>
      <path d="M26 90 L23 106 L19 118 H31 L33 90 Z" fill={DRAWN.brown} stroke={line} strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M39 90 L42 106 L46 118 H34 L33 90 Z" fill={DRAWN.brown} stroke={line} strokeWidth="1.2" strokeLinejoin="round" />
      <ellipse cx="25" cy="118" rx="7" ry="3.5" fill={DRAWN.yellow} stroke={line} strokeWidth="1" />
      <ellipse cx="47" cy="118" rx="7" ry="3.5" fill={DRAWN.yellow} stroke={line} strokeWidth="1" />
    </>
  )
}

function CharacterNeck({ line }: { line: string }) {
  return (
    <path
      d="M31 50 Q36 46 41 50 L39 58 L33 58 Z"
      fill={DRAWN.skin}
      stroke={line}
      strokeWidth="1"
      strokeLinejoin="round"
    />
  )
}

function CharacterFace({ line, glasses = false }: { line: string; glasses?: boolean }) {
  return (
    <>
      <ellipse cx="36" cy="32" rx="14" ry="16" fill={DRAWN.skin} stroke={line} strokeWidth="1.3" />
      <ellipse cx="28" cy="36" rx="3" ry="3.5" fill={DRAWN.blush} opacity="0.5" />
      <ellipse cx="44" cy="36" rx="3" ry="3.5" fill={DRAWN.blush} opacity="0.5" />
      <circle cx="30" cy="32" r="2" fill={line} />
      <circle cx="42" cy="32" r="2" fill={line} />
      <path d="M31 40 Q36 44 41 40" stroke={line} strokeWidth="1.4" strokeLinecap="round" fill="none" />
      {glasses ? (
        <>
          <circle cx="30" cy="32" r="5.5" fill="none" stroke={line} strokeWidth="1.1" />
          <circle cx="42" cy="32" r="5.5" fill="none" stroke={line} strokeWidth="1.1" />
          <line x1="35.5" y1="32" x2="36.5" y2="32" stroke={line} strokeWidth="1" />
        </>
      ) : null}
    </>
  )
}

/** Male shop owner — straw hat, orange shirt, dusty-blue apron */
export function OwnerMan({
  x,
  y,
  scale = 1,
  pose = "wave-right",
  light = false,
}: {
  x: number
  y: number
  scale?: number
  pose?: Pose
  light?: boolean
}) {
  const line = light ? "#FFFFFF" : DRAWN.line
  const resolvedPose = pose === "stand" ? "stand" : pose

  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`} opacity={light ? 0.95 : 1}>
      <CharacterShadow light={light} />
      <CharacterLegs line={line} />
      <path
        d="M19 56 Q36 48 53 56 L55 92 L17 92 Z"
        fill={DRAWN.orange}
        stroke={line}
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
      <path
        d="M21 60 Q36 54 51 60 L53 94 L19 94 Z"
        fill={DRAWN.dustyBlue}
        stroke={line}
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <path d="M30 72 Q36 70 42 72 L41 86 L31 86 Z" fill={DRAWN.dustyBlueDark} opacity="0.35" />
      {resolvedPose === "wave-left" ? (
        <path d="M17 64 Q2 52 8 40" stroke={DRAWN.skin} strokeWidth="8" strokeLinecap="round" fill="none" />
      ) : (
        <path d="M17 68 L10 82" stroke={DRAWN.skin} strokeWidth="7" strokeLinecap="round" />
      )}
      <CharacterNeck line={line} />
      <CharacterFace line={line} />
      <ellipse cx="36" cy="18" rx="17" ry="5.5" fill={DRAWN.straw} stroke={line} strokeWidth="1" />
      <path d="M21 20 Q36 8 51 20" fill={DRAWN.straw} stroke={line} strokeWidth="1.2" />
      <path d="M26 36 Q30 40 34 38" fill={DRAWN.beard} opacity="0.65" />
      <path d="M38 36 Q42 40 46 38" fill={DRAWN.beard} opacity="0.65" />
      {resolvedPose === "wave-right" ? (
        <path d="M55 64 Q70 50 64 38" stroke={DRAWN.skin} strokeWidth="8" strokeLinecap="round" fill="none" />
      ) : (
        <path d="M55 68 L62 82" stroke={DRAWN.skin} strokeWidth="7" strokeLinecap="round" />
      )}
    </g>
  )
}

/** Female shop owner — mustard shirt, dusty-blue apron, glasses */
export function OwnerWoman({
  x,
  y,
  scale = 1,
  pose = "wave-left",
  light = false,
}: {
  x: number
  y: number
  scale?: number
  pose?: Pose
  light?: boolean
}) {
  const line = light ? "#FFFFFF" : DRAWN.line
  const resolvedPose = pose === "stand" ? "stand" : pose

  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`} opacity={light ? 0.95 : 1}>
      <CharacterShadow light={light} />
      <CharacterLegs line={line} />
      <path
        d="M19 56 Q36 48 53 56 L55 92 L17 92 Z"
        fill={DRAWN.mustard}
        stroke={line}
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
      <path
        d="M21 60 Q36 54 51 60 L53 94 L19 94 Z"
        fill={DRAWN.dustyBlue}
        stroke={line}
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <path d="M30 72 Q36 70 42 72 L41 86 L31 86 Z" fill={DRAWN.dustyBlueDark} opacity="0.35" />
      {resolvedPose === "wave-right" ? (
        <path d="M55 64 Q70 50 64 38" stroke={DRAWN.skin} strokeWidth="8" strokeLinecap="round" fill="none" />
      ) : (
        <path d="M55 68 L62 82" stroke={DRAWN.skin} strokeWidth="7" strokeLinecap="round" />
      )}
      <CharacterNeck line={line} />
      <path d="M20 20 Q36 6 52 20 L50 34 Q36 26 22 34 Z" fill={DRAWN.hair} stroke={line} strokeWidth="1.2" />
      <CharacterFace line={line} glasses />
      {resolvedPose === "wave-left" ? (
        <path d="M17 64 Q2 50 10 38" stroke={DRAWN.skin} strokeWidth="8" strokeLinecap="round" fill="none" />
      ) : (
        <path d="M17 68 L10 82" stroke={DRAWN.skin} strokeWidth="7" strokeLinecap="round" />
      )}
    </g>
  )
}

/** Happy customer — simpler, same proportions */
export function Customer({
  x,
  y,
  scale = 1,
  shirt = DRAWN.orange,
}: {
  x: number
  y: number
  scale?: number
  shirt?: string
}) {
  const line = DRAWN.line
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <CharacterShadow />
      <CharacterLegs line={line} />
      <path d="M19 56 Q36 48 53 56 L55 92 L17 92 Z" fill={shirt} stroke={line} strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M17 68 L10 82" stroke={DRAWN.skin} strokeWidth="7" strokeLinecap="round" />
      <path d="M55 68 L62 82" stroke={DRAWN.skin} strokeWidth="7" strokeLinecap="round" />
      <CharacterNeck line={line} />
      <path d="M20 18 Q36 6 52 18 L50 30 Q36 22 22 30 Z" fill={DRAWN.hair} stroke={line} strokeWidth="1.1" />
      <CharacterFace line={line} />
    </g>
  )
}

export function PottedPlant({ x, y, light = false }: { x: number; y: number; light?: boolean }) {
  const line = light ? "rgba(255,255,255,0.5)" : DRAWN.line
  return (
    <g transform={`translate(${x} ${y})`}>
      <path d="M6 30 H26 V38 H6 Z" fill={DRAWN.pot} stroke={line} strokeWidth="1.2" />
      <path d="M4 38 H28 V42 H4 Z" fill={DRAWN.pot} stroke={line} strokeWidth="1" />
      <path d="M16 30 Q9 20 13 10 Q16 18 16 30" fill={DRAWN.plant} stroke={line} strokeWidth="1" />
      <path d="M16 30 Q23 18 21 8 Q18 16 16 30" fill={DRAWN.plantDark} stroke={line} strokeWidth="1" opacity="0.8" />
      <path d="M16 30 V8" stroke={DRAWN.plant} strokeWidth="1.5" strokeLinecap="round" />
    </g>
  )
}

export function HeartAccent({ x, y, size = 14, opacity = 0.5 }: { x: number; y: number; size?: number; opacity?: number }) {
  const s = size / 14
  return (
    <path
      transform={`translate(${x} ${y}) scale(${s})`}
      d="M7 4 C5 1 1 1 1 5 C1 9 7 14 7 14 C7 14 13 9 13 5 C13 1 9 1 7 4Z"
      fill={DRAWN.signal}
      opacity={opacity}
      stroke={DRAWN.line}
      strokeWidth="0.8"
    />
  )
}
