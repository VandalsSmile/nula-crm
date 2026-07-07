import { cn } from "@/lib/utils"

export function Logo({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground",
        className,
      )}
    >
      <span className="text-sm font-bold tracking-tight">N</span>
    </div>
  )
}
