import {
  FilePlus2,
  Pencil,
  CalendarClock,
  CheckCircle2,
  XCircle,
  Link2,
  Eye,
  ThumbsUp,
  FileText,
  Unplug,
} from "lucide-react"

import { type Activity } from "@/lib/mock-data"
import { relativeTime } from "@/lib/format"
import { cn } from "@/lib/utils"

const config: Record<Activity["type"], { icon: typeof FilePlus2; className: string }> = {
  created: { icon: FilePlus2, className: "bg-muted text-muted-foreground" },
  edited: { icon: Pencil, className: "bg-muted text-muted-foreground" },
  scheduled: { icon: CalendarClock, className: "bg-primary/10 text-primary" },
  published: { icon: CheckCircle2, className: "bg-success/15 text-success" },
  failed: { icon: XCircle, className: "bg-destructive/10 text-destructive" },
  connected: { icon: Link2, className: "bg-info/15 text-info" },
  disconnected: { icon: Unplug, className: "bg-muted text-muted-foreground" },
  review: { icon: Eye, className: "bg-warning/15 text-warning-foreground" },
  approved: { icon: ThumbsUp, className: "bg-info/15 text-info" },
  status_report: { icon: FileText, className: "bg-primary/10 text-primary" },
}

const defaultConfig = config.created

export function ActivityFeed({ items = [] }: { items?: Activity[] }) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">No recent activity yet.</p>
  }
  return (
    <ol className="flex flex-col">
      {items.map((a, i) => {
        const { icon: Icon, className } = config[a.type] ?? defaultConfig
        return (
          <li key={a.id} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span className={cn("flex size-8 items-center justify-center rounded-full", className)}>
                <Icon className="size-4" />
              </span>
              {i < items.length - 1 ? <span className="w-px flex-1 bg-border" /> : null}
            </div>
            <div className="flex flex-col pb-5">
              <p className="text-sm leading-snug text-muted-foreground">{a.message}</p>
              <span className="text-xs text-muted-foreground/80">{relativeTime(a.at)}</span>
            </div>
          </li>
        )
      })}
    </ol>
  )
}
