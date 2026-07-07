"use client"

import Link from "next/link"
import { Users, Flame, Clock, UserPlus, Sparkles } from "lucide-react"

import { PageHeader } from "@/components/page-header"
import { StatCard } from "@/components/stat-card"
import { ActivityFeed } from "@/components/activity-feed"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { Activity, Contact, DashboardStats } from "@/lib/crm-types"
import { APP_ROUTES, contactPath } from "@/lib/routes"

export function DashboardView({
  contacts,
  activities,
  stats,
}: {
  contacts: Contact[]
  activities: Activity[]
  stats: DashboardStats
}) {
  const inactive = stats.inactiveCustomers

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Dashboard"
        description="What matters this week — leads, follow-ups, and recommended AI actions."
        actions={
          <Button render={<Link href={APP_ROUTES.contacts} />}>
            <UserPlus data-icon="inline-start" />
            Add contact
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="New leads (7d)" value={stats.newLeads} icon={UserPlus} tone="primary" />
        <StatCard label="Hot leads" value={stats.hotLeads} icon={Flame} tone="warning" />
        <StatCard label="Needs follow-up" value={stats.needsFollowUp} icon={Clock} tone="primary" />
        <StatCard label="Total contacts" value={stats.totalContacts} icon={Users} tone="primary" />
      </div>

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
              Open AI Command Center
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
              <p className="text-sm text-muted-foreground">No contacts yet.</p>
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
            <ActivityFeed items={activities} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
