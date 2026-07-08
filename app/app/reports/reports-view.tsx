import { Megaphone, Percent, TrendingUp, Users } from "lucide-react"

import { PageHeader } from "@/components/page-header"
import { StatCard } from "@/components/stat-card"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { ReportData } from "@/lib/crm-types"

function BarRow({ label, count, max }: { label: string; count: number; max: number }) {
  const pct = max > 0 ? (count / max) * 100 : 0
  const width = count > 0 ? Math.max(pct, 4) : 0
  return (
    <div className="flex items-center gap-3">
      <span className="w-36 shrink-0 truncate text-sm text-muted-foreground" title={label}>
        {label}
      </span>
      <div className="h-6 flex-1 overflow-hidden rounded-md bg-muted">
        <div className="h-full rounded-md bg-primary/80" style={{ width: `${width}%` }} />
      </div>
      <span className="w-10 shrink-0 text-right text-sm font-medium tabular-nums">{count}</span>
    </div>
  )
}

export function ReportsView({ data }: { data: ReportData }) {
  const sourceMax = Math.max(1, ...data.leadsBySource.map((s) => s.count))
  const stageMax = Math.max(1, ...data.lifecycleFunnel.map((s) => s.count))
  const campaignMax = Math.max(1, ...data.campaignsByStatus.map((s) => s.count))

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Reports"
        description="Leads by source, conversion, and campaign performance."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total contacts" value={data.totalContacts} icon={Users} tone="primary" />
        <StatCard label="Customers" value={data.customers} icon={TrendingUp} tone="success" />
        <StatCard
          label="Conversion rate"
          value={`${data.conversionRate}%`}
          icon={Percent}
          tone="warning"
          hint="Customers ÷ total contacts"
        />
        <StatCard label="Campaigns" value={data.totalCampaigns} icon={Megaphone} tone="primary" />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Leads by source</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2.5">
            {data.leadsBySource.length === 0 ? (
              <p className="text-sm text-muted-foreground">No contacts yet.</p>
            ) : (
              data.leadsBySource.map((s) => (
                <BarRow key={s.source} label={s.source} count={s.count} max={sourceMax} />
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Lifecycle funnel</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2.5">
            {data.lifecycleFunnel.map((s) => (
              <BarRow key={s.stage} label={s.stage} count={s.count} max={stageMax} />
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Campaigns by status</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2.5">
          {data.campaignsByStatus.length === 0 ? (
            <p className="text-sm text-muted-foreground">No campaigns yet.</p>
          ) : (
            data.campaignsByStatus.map((s) => (
              <BarRow key={s.status} label={s.status} count={s.count} max={campaignMax} />
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}
