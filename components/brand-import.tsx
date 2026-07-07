"use client"

import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * Preview block for fetched brand assets: a logo thumbnail plus a row of
 * selectable color swatches. Renders nothing until there's something to show.
 */
export function BrandImport({
  logoUrl,
  colors,
  accentColor,
  onSelectAccent,
}: {
  logoUrl: string | null
  colors: string[]
  accentColor: string | null
  onSelectAccent: (hex: string) => void
}) {
  if (!logoUrl && colors.length === 0) return null

  return (
    <div className="flex flex-col gap-3 rounded-lg border bg-muted/30 p-3">
      <div className="flex items-center gap-3">
        {logoUrl ? (
          <span className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-card">
            {/* Remote/blob logo of unknown dimensions — plain img avoids next/image domain config. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logoUrl || "/placeholder.svg"} alt="Fetched brand logo" className="size-full object-contain" />
          </span>
        ) : null}
        <div className="flex min-w-0 flex-col">
          <span className="text-sm font-medium">Brand preview</span>
          <span className="text-xs text-muted-foreground">
            {logoUrl ? "Logo detected. " : ""}
            {colors.length > 0 ? "Pick an accent color." : "No colors detected."}
          </span>
        </div>
      </div>

      {colors.length > 0 ? (
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Accent color">
          {colors.map((hex) => {
            const selected = accentColor?.toLowerCase() === hex.toLowerCase()
            return (
              <button
                key={hex}
                type="button"
                role="radio"
                aria-checked={selected}
                aria-label={hex}
                onClick={() => onSelectAccent(hex)}
                className={cn(
                  "relative flex size-8 items-center justify-center rounded-full border transition",
                  selected ? "ring-2 ring-ring ring-offset-2 ring-offset-background" : "hover:scale-105",
                )}
                style={{ backgroundColor: hex }}
              >
                {selected ? <Check className="size-4 text-white drop-shadow" /> : null}
              </button>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
