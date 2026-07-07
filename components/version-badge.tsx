import { formatAppVersion } from "@/lib/version"
import { cn } from "@/lib/utils"

export function VersionBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border bg-muted/60 px-2 py-0.5 text-[11px] font-medium tabular-nums text-muted-foreground",
        className,
      )}
    >
      {formatAppVersion()}
    </span>
  )
}
