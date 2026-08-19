"use client"

import useSWR from "swr"
import { RefreshCw } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { getCampaignSendHistory, type CampaignSendHistory } from "@/app/actions/campaigns"

function fmt(iso: string | null): string {
  if (!iso) return "—"
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

function statusVariant(status: string): "default" | "secondary" | "outline" | "destructive" {
  if (status === "sent") return "default"
  if (status === "failed") return "destructive"
  if (status === "skipped") return "outline"
  return "secondary"
}

export function CampaignSendHistory({ campaignId }: { campaignId: string }) {
  const { data, isLoading, mutate, isValidating } = useSWR<CampaignSendHistory>(
    ["campaign-sends", campaignId],
    () => getCampaignSendHistory(campaignId),
  )

  const counts = data?.counts
  const recipients = data?.recipients ?? []

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-2">
        <CardTitle className="text-base">Send history</CardTitle>
        <Button variant="outline" size="sm" onClick={() => mutate()} disabled={isValidating}>
          <RefreshCw data-icon="inline-start" className={isValidating ? "animate-spin" : undefined} />
          Refresh
        </Button>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {counts ? (
          <div className="flex flex-wrap gap-2 text-sm">
            <Badge variant="default">{counts.sent} sent</Badge>
            {counts.failed > 0 ? <Badge variant="destructive">{counts.failed} failed</Badge> : null}
            {counts.skipped > 0 ? <Badge variant="outline">{counts.skipped} skipped</Badge> : null}
            {counts.scheduled + counts.sending > 0 ? (
              <Badge variant="secondary">{counts.scheduled + counts.sending} scheduled</Badge>
            ) : null}
            <span className="ml-auto text-muted-foreground">{counts.total} total</span>
          </div>
        ) : null}

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : recipients.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No sends yet. Launch this campaign to start sending; sent, scheduled, and failed emails
            will appear here.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Recipient</TableHead>
                  <TableHead>Email #</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Scheduled</TableHead>
                  <TableHead>Sent</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recipients.map((r, i) => (
                  <TableRow key={`${r.contactId}-${r.step}-${i}`}>
                    <TableCell>
                      <div className="font-medium">{r.name}</div>
                      {r.email ? <div className="text-xs text-muted-foreground">{r.email}</div> : null}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{r.step}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(r.status)}>{r.status}</Badge>
                      {r.error ? (
                        <div className="mt-0.5 max-w-48 truncate text-xs text-destructive" title={r.error}>
                          {r.error}
                        </div>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{fmt(r.scheduledFor)}</TableCell>
                    <TableCell className="text-muted-foreground">{fmt(r.sentAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
