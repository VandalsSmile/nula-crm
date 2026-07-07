"use client"

import Link from "next/link"
import { Users, Link2, Plus } from "lucide-react"

import { PageHeader } from "@/components/page-header"
import { StatCard } from "@/components/stat-card"
import { ActivityFeed } from "@/components/activity-feed"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { Activity, Client } from "@/lib/mock-data"

export function DashboardView({
  clients,
  activities,
  stats,
}: {
  clients: Client[]
  activities: Activity[]
  stats: { totalClients: number; lacrmConnected: number }
}) {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Dashboard"
        description="Overview of your client workspace and recent activity."
        actions={
          <Button render={<Link href="/clients" />}>
            <Plus data-icon="inline-start" />
            Add client
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard label="Total clients" value={String(stats.totalClients)} icon={Users} />
        <StatCard
          label="LACRM connected"
          value={String(stats.lacrmConnected)}
          icon={Link2}
          hint={`${stats.totalClients - stats.lacrmConnected} not connected`}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent clients</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {clients.length === 0 ? (
              <p className="text-sm text-muted-foreground">No clients yet. Add your first client to get started.</p>
            ) : (
              clients.slice(0, 5).map((client) => (
                <Link
                  key={client.id}
                  href={`/clients/${client.id}`}
                  className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm transition-colors hover:bg-muted/50"
                >
                  <span className="font-medium">{client.name}</span>
                  <span className="text-muted-foreground">{client.lacrm.status}</span>
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
