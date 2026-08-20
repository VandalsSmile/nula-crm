"use client"

import { useState } from "react"
import Link from "next/link"
import { Users, Flame, Clock, UserPlus, Sparkles, CalendarClock } from "lucide-react"

import { PageHeader } from "@/components/page-header"
import { StatCard } from "@/components/stat-card"
import { ActivityFeed } from "@/components/activity-feed"
import { AddContactDialog } from "@/components/add-contact-dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { Activity, Contact, DashboardStats, Task } from "@/lib/crm-types"
import { APP_ROUTES, contactPath } from "@/lib/routes"
import { formatDateTime } from "@/lib/format"

export function DashboardView({
  contacts,
  activities,
  stats,
  dueTasks,
}: {
  contacts: Contact[]
  activities: Activity[]
  stats: DashboardStats
  dueTasks: Task[]
}) {
  const inactive = stats.inactiveCustomers
  const [addOpen, setAddOpen] = useState(false)
  const [now] = useState(() => Date.now())

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Dashboard"
        description="What matters this week — leads, follow-ups, and recommended AI actions."
        actions={
          <Button onClick={() => setAddOpen(true)}>
            <UserPlus data-icon="inline-start" />
            Add contact
          </Button>
        }
      />

      <AddContactDialog open={addOpen} onOpenChange={setAddOpen} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="New leads (last 7 days)" value={stats.newLeads} icon={UserPlus} tone="primary" />
        <StatCard label="Hot leads" value={stats.hotLeads} icon={Flame} tone="warning" />
        <StatCard label="Needs follow-up" value={stats.needsFollowUp} icon={Clock} tone="primary" />
        <StatCard label="Total contacts" value={stats.totalContacts} icon={Users} tone="primary" />
      </div>

      {dueTasks.length > 0 ? (
        <Card className="border-amber-300/40 bg-amber-50/60 dark:bg-amber-500/5">
          <CardHeader className="flex-row items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarClock className="size-4 text-amber-600" />
              Tasks due
            </CardTitle>
            <Button variant="outline" size="sm" render={<Link href={APP_ROUTES.tasks} />}>
              View all
            </Button>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {dueTasks.map((task) => {
              const overdue = !!task.dueAt && new Date(task.dueAt).getTime() < now
              return (
                <Link
                  key={task.id}
                  href={APP_ROUTES.tasks}
                  className="flex items-center justify-between gap-3 rounded-lg border bg-background px-3 py-2 hover:bg-muted/40"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">{task.title}</span>
                    {task.contactName ? (
                      <span className="block truncate text-xs text-muted-foreground">
                        {task.contactName}
                      </span>
                    ) : null}
                  </span>
                  {task.dueAt ? (
                    <Badge variant={overdue ? "destructive" : "secondary"} className="shrink-0">
                      {formatDateTime(task.dueAt)}
                    </Badge>
                  ) : null}
                </Link>
              )
            })}
          </CardContent>
        </Card>
      ) : null}

      {inactive > 0 ? (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <Sparkles className="mt-0.5 size-5 text-primary" />
              <div>
                <p className="font-medium">
                  {inactive} customer{inactive === 1 ? "" : "s"} haven&apos;t purchased in 90 days.
                </p>
                <p className="text-sm text-muted-foreground">
                  Want me to create a reactivation campaign?
                </p>
              </div>
            </div>
            <Button variant="outline" render={<Link href={APP_ROUTES.ai} />}>
              Open AI Assistant
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent contacts</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {contacts.length === 0 ? (
              <div className="flex flex-col items-start gap-3 py-2">
                <p className="text-sm text-muted-foreground">
                  No contacts yet. Add your first one to get started.
                </p>
                <Button size="sm" onClick={() => setAddOpen(true)}>
                  <UserPlus data-icon="inline-start" />
                  Add contact
                </Button>
              </div>
            ) : (
              contacts.slice(0, 6).map((c) => (
                <Link
                  key={c.id}
                  href={contactPath(c.id)}
                  className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm hover:bg-muted/50"
                >
                  <span className="font-medium">{c.fullName}</span>
                  <span className="text-muted-foreground">{c.lifecycleStage}</span>
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent activity</CardTitle>
          </CardHeader>
          <CardContent>
            <ActivityFeed items={activities} showContext />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
