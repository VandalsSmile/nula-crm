import { ImageResponse } from "next/og"

export const size = { width: 32, height: 32 }
export const contentType = "image/png"

export default function Icon() {
  return new ImageResponse(
    (
      <svg width="32" height="32" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="g" x1="8" y1="4" x2="34" y2="36" gradientUnits="userSpaceOnUse">
            <stop stopColor="#4F3DF5" />
            <stop offset="1" stopColor="#1B1533" />
          </linearGradient>
        </defs>
        <rect width="40" height="40" rx="10" fill="url(#g)" />
        <circle
          cx="20"
          cy="20"
          r="9"
          stroke="#F7F6FB"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeDasharray="48 18"
          transform="rotate(-35 20 20)"
          fill="none"
        />
        <circle cx="27.5" cy="14.5" r="2.75" fill="#33E5C4" />
      </svg>
    ),
    { ...size },
  )
}
