import { X } from "lucide-react"

import { cn } from "@/lib/utils"

const DEFAULT_TAG_COLOR = "#4F3DF5"

/**
 * Renders a tag as a colored chip using the tag's own color (tint background +
 * border + a solid dot), so the color a user picks is actually reflected.
 * color-mix keeps it legible for any valid CSS color (hex or oklch).
 */
export function TagBadge({
  name,
  color,
  onRemove,
  removeDisabled,
  className,
}: {
  name: string
  color?: string | null
  onRemove?: () => void
  removeDisabled?: boolean
  className?: string
}) {
  const c = color?.trim() || DEFAULT_TAG_COLOR
  return (
    <span
      className={cn(
        "inline-flex h-5 items-center gap-1 rounded-full border px-2 text-xs font-medium",
        className,
      )}
      style={{
        backgroundColor: `color-mix(in srgb, ${c} 14%, transparent)`,
        borderColor: `color-mix(in srgb, ${c} 45%, transparent)`,
        color: `color-mix(in srgb, ${c} 62%, #1b1533)`,
      }}
    >
      <span className="size-1.5 shrink-0 rounded-full" style={{ backgroundColor: c }} />
      {name}
      {onRemove ? (
        <button
          type="button"
          className="-mr-1 rounded-sm p-0.5 hover:bg-black/10"
          disabled={removeDisabled}
          onClick={onRemove}
          aria-label={`Remove ${name}`}
        >
          <X className="size-3" />
        </button>
      ) : null}
    </span>
  )
}
