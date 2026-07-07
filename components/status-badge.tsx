import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { LacrmConnectionStatus } from "@/lib/mock-data"

const lacrmStatusStyles: Record<LacrmConnectionStatus, string> = {
  Connected: "bg-success/15 text-success border-success/30",
  Failed: "bg-destructive/10 text-destructive border-destructive/30",
  Disconnected: "bg-muted text-muted-foreground border-transparent",
}

export function LacrmStatusBadge({
  status,
  className,
}: {
  status: LacrmConnectionStatus
  className?: string
}) {
  return (
    <Badge variant="outline" className={cn("font-medium", lacrmStatusStyles[status], className)}>
      <span
        className={cn(
          "mr-1.5 inline-block size-1.5 rounded-full",
          status === "Connected" && "bg-success",
          status === "Failed" && "bg-destructive",
          status === "Disconnected" && "bg-muted-foreground",
        )}
      />
      LACRM {status}
    </Badge>
  )
}
