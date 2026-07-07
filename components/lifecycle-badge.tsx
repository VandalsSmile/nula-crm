import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { LifecycleStage } from "@/lib/crm-types"
import { leadScoreLabel } from "@/lib/crm-types"

const stageStyles: Record<string, string> = {
  "New Lead": "bg-info/15 text-info border-info/30",
  Contacted: "bg-primary/10 text-primary border-primary/25",
  Interested: "bg-warning/15 text-warning-foreground border-warning/30",
  Booked: "bg-success/15 text-success border-success/30",
  Customer: "bg-success/15 text-success border-success/30",
  "Repeat Customer": "bg-success/15 text-success border-success/30",
  "Inactive Customer": "bg-muted text-muted-foreground border-transparent",
  "Lost / Unqualified": "bg-destructive/10 text-destructive border-destructive/30",
}

export function LifecycleBadge({ stage, className }: { stage: LifecycleStage | string; className?: string }) {
  return (
    <Badge variant="outline" className={cn("font-medium", stageStyles[stage] ?? stageStyles["New Lead"], className)}>
      {stage}
    </Badge>
  )
}

export function LeadScoreBadge({ score, className }: { score: number; className?: string }) {
  const label = leadScoreLabel(score)
  const tone =
    label === "Hot"
      ? "bg-nula-signal/15 text-[#0d5c4e] border-nula-signal/40 dark:text-nula-signal"
      : label === "Warm"
        ? "bg-warning/15 text-warning-foreground border-warning/30"
        : "bg-muted text-muted-foreground border-transparent"

  return (
    <Badge variant="outline" className={cn("font-medium tabular-nums", tone, className)}>
      {score} · {label}
    </Badge>
  )
}
