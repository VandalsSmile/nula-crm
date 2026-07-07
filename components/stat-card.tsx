import type { LucideIcon } from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

export function StatCard({
  label,
  value,
  icon: Icon,
  hint,
  tone = "primary",
}: {
  label: string
  value: string | number
  icon: LucideIcon
  hint?: string
  tone?: "primary" | "success" | "warning" | "danger"
}) {
  const toneClasses = {
    primary: "bg-primary/10 text-primary",
    success: "bg-success/15 text-success",
    warning: "bg-warning/15 text-warning-foreground",
    danger: "bg-destructive/10 text-destructive",
  }[tone]

  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-5">
        <div className={cn("flex size-11 items-center justify-center rounded-xl", toneClasses)}>
          <Icon className="size-5" />
        </div>
        <div className="flex flex-col">
          <span className="text-2xl font-semibold tracking-tight tabular-nums">{value}</span>
          <span className="text-sm text-muted-foreground">{label}</span>
          {hint ? <span className="mt-0.5 text-xs text-muted-foreground/80">{hint}</span> : null}
        </div>
      </CardContent>
    </Card>
  )
}
