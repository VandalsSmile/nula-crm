import Link from "next/link"
import type { LucideIcon } from "lucide-react"
import {
  ArrowRight,
  BarChart3,
  Briefcase,
  Inbox,
  Layers,
  Megaphone,
  Rocket,
  Settings,
  Sparkles,
  Users,
  Zap,
} from "lucide-react"

import { PageHeader } from "@/components/page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { appPageMetadata } from "@/lib/seo"
import { APP_ROUTES } from "@/lib/routes"

export const metadata = appPageMetadata(
  "Help & docs",
  "Quick, simple walkthroughs for every Nula CRM feature.",
  APP_ROUTES.help,
)

type Guide = {
  icon: LucideIcon
  title: string
  blurb: string
  steps: string[]
  href?: string
  linkLabel?: string
}

const GUIDES: Guide[] = [
  {
    icon: Rocket,
    title: "Getting started",
    blurb: "Set up your workspace and get your first contacts in.",
    steps: [
      "Open Settings → Company to set your business name and industry.",
      "Add teammates from Settings → Team (choose their role).",
      "Add contacts manually, import a CSV, or connect your website lead form.",
      "Check the Dashboard each morning for new leads and follow-ups.",
    ],
    href: APP_ROUTES.settings,
    linkLabel: "Open settings",
  },
  {
    icon: Sparkles,
    title: "AI command bar",
    blurb: "Ask for what you want in plain English — you approve before anything changes.",
    steps: [
      "Type a request in the command bar at the top of any page (e.g. \u201cnormalize all tags\u201d).",
      "Click Run to see a preview of exactly what will happen.",
      "Approve to execute, or cancel if it\u2019s not what you wanted.",
      "Changed your mind? Open the AI Command Center and click \u201cUndo last action.\u201d",
    ],
    href: APP_ROUTES.ai,
    linkLabel: "Open AI Command Center",
  },
  {
    icon: Users,
    title: "Contacts",
    blurb: "Your people — leads, customers, and everyone in between.",
    steps: [
      "Click \u201cAdd contact\u201d or \u201cImport CSV\u201d to bring people in.",
      "Use the search box to find anyone by name, email, or phone.",
      "Open a contact to edit details, add tags/groups, or add a deal.",
      "Click \u201cRecord purchase\u201d on a contact to log a sale (turns them into a customer).",
    ],
    href: APP_ROUTES.contacts,
    linkLabel: "Go to Contacts",
  },
  {
    icon: Briefcase,
    title: "Deals",
    blurb: "A simple pipeline you can actually keep up with.",
    steps: [
      "Add a deal from a contact\u2019s profile (title, value, stage).",
      "Open Deals to see every deal grouped by stage with totals.",
      "Use the stage dropdown on a card to move a deal forward.",
      "Watch the per-stage totals to see where your revenue sits.",
    ],
    href: APP_ROUTES.deals,
    linkLabel: "Go to Deals",
  },
  {
    icon: Layers,
    title: "Groups & tags",
    blurb: "Tags describe facts; groups describe audiences.",
    steps: [
      "Add tags (e.g. \u201cvip\u201d, \u201cneeds-follow-up\u201d) to record facts about a contact.",
      "Create groups to build audiences you\u2019ll market to.",
      "Add contacts to a group from the contact profile or the AI command bar.",
      "Target a campaign at a group to reach that whole audience.",
    ],
    href: APP_ROUTES.groups,
    linkLabel: "Go to Groups",
  },
  {
    icon: Megaphone,
    title: "Campaigns",
    blurb: "Multi-step email/SMS sequences, sent on your schedule.",
    steps: [
      "Start from a template or an AI suggestion to create a draft.",
      "Edit the campaign: pick the target group and build the message sequence.",
      "Add steps with a channel (email/SMS), message, and a delay in days.",
      "Submit for approval, then Launch — steps go out over time automatically.",
    ],
    href: APP_ROUTES.campaigns,
    linkLabel: "Go to Campaigns",
  },
  {
    icon: Inbox,
    title: "Inbox",
    blurb: "Email and SMS conversations in one place.",
    steps: [
      "Pick a conversation from the list on the left.",
      "Read the full thread of inbound and outbound messages.",
      "Type a reply and click Send — it\u2019s logged on the contact\u2019s timeline.",
      "New inbound messages create or match a contact automatically.",
    ],
    href: APP_ROUTES.inbox,
    linkLabel: "Go to Inbox",
  },
  {
    icon: Zap,
    title: "Automations",
    blurb: "Set-and-forget rules that follow up for you.",
    steps: [
      "Review the default automations (new-lead follow-up, inactive detection, review requests).",
      "Toggle any automation on or off with the switch.",
      "Click \u201cRun inactive check now\u201d to flag customers who haven\u2019t bought recently.",
      "Automations create campaign drafts and tag/segment contacts as they run.",
    ],
    href: APP_ROUTES.automations,
    linkLabel: "Go to Automations",
  },
  {
    icon: BarChart3,
    title: "Reports",
    blurb: "See what\u2019s working at a glance.",
    steps: [
      "Open Reports for leads by source, your lifecycle funnel, and campaign status.",
      "Use the stat cards for totals: contacts, customers, and conversion rate.",
      "Check the funnel to spot where leads get stuck.",
    ],
    href: APP_ROUTES.reports,
    linkLabel: "Go to Reports",
  },
  {
    icon: Settings,
    title: "Settings & team",
    blurb: "Your profile, your company, and your teammates.",
    steps: [
      "Profile: update your name, photo, phone, and job title.",
      "Company: set your business name, industry, website, and contact info.",
      "Team (admins): invite teammates and choose their role.",
      "Security: change your password anytime.",
    ],
    href: APP_ROUTES.settings,
    linkLabel: "Open settings",
  },
]

export default function HelpPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Help & docs"
        description="Quick, simple walkthroughs for every feature. Pick a topic below."
      />

      <div className="grid gap-4 md:grid-cols-2">
        {GUIDES.map((guide) => (
          <Card key={guide.title} className="flex flex-col">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2.5 text-base">
                <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <guide.icon className="size-4" />
                </span>
                {guide.title}
              </CardTitle>
              <p className="pt-1 text-sm text-muted-foreground">{guide.blurb}</p>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col justify-between gap-4">
              <ol className="flex flex-col gap-2 text-sm">
                {guide.steps.map((step, i) => (
                  <li key={i} className="flex gap-2.5">
                    <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">
                      {i + 1}
                    </span>
                    <span className="leading-snug text-foreground/90">{step}</span>
                  </li>
                ))}
              </ol>
              {guide.href ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-fit"
                  render={<Link href={guide.href} />}
                >
                  {guide.linkLabel ?? "Open"}
                  <ArrowRight data-icon="inline-end" />
                </Button>
              ) : null}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
