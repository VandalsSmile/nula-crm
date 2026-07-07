import { cn } from "@/lib/utils"

/** Nula mark — violet gradient tile, paper arc, signal dot */
export function Logo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0", className)}
      aria-hidden
    >
      <defs>
        <linearGradient id="nula-logo-grad" x1="8" y1="4" x2="34" y2="36" gradientUnits="userSpaceOnUse">
          <stop stopColor="#4F3DF5" />
          <stop offset="1" stopColor="#1B1533" />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="10" fill="url(#nula-logo-grad)" />
      <circle
        cx="20"
        cy="20"
        r="9"
        stroke="#F7F6FB"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeDasharray="48 18"
        transform="rotate(-35 20 20)"
      />
      <circle cx="27.5" cy="14.5" r="2.75" fill="#33E5C4" />
    </svg>
  )
}
