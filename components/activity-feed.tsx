import {
  CalendarClock,
  CheckCircle2,
  FilePlus2,
  Link2,
  Mail,
  MailOpen,
  Megaphone,
  MessageSquare,
  MousePointerClick,
  Pencil,
  Phone,
  Send,
  ShoppingBag,
  StickyNote,
  Tag,
  UserPlus,
  Users,
} from "lucide-react"

import Link from "next/link"

import { type Activity } from "@/lib/crm-types"
import { relativeTime } from "@/lib/format"
import { cn } from "@/lib/utils"
import { companyPath, contactPath } from "@/lib/routes"

type IconConfig = { icon: typeof FilePlus2; className: string }

const NEUTRAL = "bg-muted text-muted-foreground"
const PRIMARY = "bg-primary/10 text-primary"
const SUCCESS = "bg-success/15 text-success"
const INFO = "bg-info/15 text-info"

const config: Record<string, IconConfig> = {
  // CRM activity types (lib/crm-types ACTIVITY_TYPES)
  form_submitted: { icon: UserPlus, className: PRIMARY },
  email_opened: { icon: Mail, className: INFO },
  email_sent: { icon: Send, className: PRIMARY },
  email_received: { icon: MailOpen, className: INFO },
  link_clicked: { icon: MousePointerClick, className: INFO },
  sms_sent: { icon: MessageSquare, className: PRIMARY },
  call_made: { icon: Phone, className: PRIMARY },
  appointment_booked: { icon: CalendarClock, className: SUCCESS },
  purchase_made: { icon: ShoppingBag, className: SUCCESS },
  note_added: { icon: StickyNote, className: NEUTRAL },
  campaign_entered: { icon: Megaphone, className: PRIMARY },
  campaign_completed: { icon: CheckCircle2, className: SUCCESS },
  tag_added: { icon: Tag, className: INFO },
  group_changed: { icon: Users, className: INFO },
  created: { icon: FilePlus2, className: NEUTRAL },
  edited: { icon: Pencil, className: NEUTRAL },
  connected: { icon: Link2, className: INFO },
}

const defaultConfig: IconConfig = config.created

export function ActivityFeed({
  items = [],
  showContext = false,
}: {
  items?: Activity[]
  /** Show which contact/company each activity is tied to (e.g. on the dashboard). */
  showContext?: boolean
}) {
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
              {showContext && (a.contactName || a.companyName) ? (
                <span className="text-xs text-foreground/70">
                  {a.contactName ? (
                    a.contactId ? (
                      <Link href={contactPath(a.contactId)} className="font-medium hover:underline">
                        {a.contactName}
                      </Link>
                    ) : (
                      <span className="font-medium">{a.contactName}</span>
                    )
                  ) : null}
                  {a.companyName && a.companyName !== a.contactName ? (
                    <>
                      {a.contactName ? " · " : null}
                      {a.companyId ? (
                        <Link href={companyPath(a.companyId)} className="hover:underline">
                          {a.companyName}
                        </Link>
                      ) : (
                        a.companyName
                      )}
                    </>
                  ) : null}
                </span>
              ) : null}
              <span className="text-xs text-muted-foreground/80">{relativeTime(a.at)}</span>
            </div>
          </li>
        )
      })}
    </ol>
  )
}
