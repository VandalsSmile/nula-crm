"use client"

import Link from "next/link"
import useSWR from "swr"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  getLeadEvents,
  getLeadSources,
  type LeadEventInfo,
  type LeadSourceInfo,
} from "@/app/actions/lead-sources"
import { relativeTime } from "@/lib/format"
import { contactPath } from "@/lib/routes"

type Data = { sources: LeadSourceInfo[]; events: LeadEventInfo[] }

async function fetchData(): Promise<Data> {
  const [sources, events] = await Promise.all([getLeadSources(), getLeadEvents()])
  return { sources, events }
}

const CHANNEL_LABELS: Record<string, string> = {
  web_form: "Web form",
  webhook: "Webhook",
  email: "Email",
  call: "Phone call",
  csv: "CSV import",
  api: "API",
}

function statusVariant(status: string): "default" | "secondary" | "outline" | "destructive" {
  if (status === "processed") return "default"
  if (status === "failed") return "destructive"
  if (status === "duplicate") return "outline"
  return "secondary"
}

export function LeadSourcesSettings() {
  const { data, isLoading } = useSWR<Data>("lead-sources", fetchData)
  const sources = data?.sources ?? []
  const events = data?.events ?? []

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Lead sources</CardTitle>
          <CardDescription>
            Every channel leads flow in through. Sources are created automatically the first time a
            channel receives a lead. (Configurable embeds, webhooks, and routing rules are coming
            next.)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Source</TableHead>
                  <TableHead>Channel</TableHead>
                  <TableHead>Key</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-sm text-muted-foreground">
                      Loading…
                    </TableCell>
                  </TableRow>
                ) : sources.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-sm text-muted-foreground">
                      No lead sources yet. They appear here after your first lead comes in.
                    </TableCell>
                  </TableRow>
                ) : (
                  sources.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.name}</TableCell>
                      <TableCell>{CHANNEL_LABELS[s.channel] ?? s.channel}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{s.key}</TableCell>
                      <TableCell>
                        <Badge variant={s.enabled ? "default" : "secondary"}>
                          {s.enabled ? "Active" : "Disabled"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent lead events</CardTitle>
          <CardDescription>The latest inbound leads across all channels, for auditing.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Channel</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>When</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-sm text-muted-foreground">
                      Loading…
                    </TableCell>
                  </TableRow>
                ) : events.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-sm text-muted-foreground">
                      No lead events yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  events.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell>{CHANNEL_LABELS[e.channel] ?? e.channel}</TableCell>
                      <TableCell>
                        <Badge variant={statusVariant(e.status)}>{e.status}</Badge>
                      </TableCell>
                      <TableCell>
                        {e.contactId ? (
                          <Link
                            href={contactPath(e.contactId)}
                            className="text-sm text-primary hover:underline"
                          >
                            View contact
                          </Link>
                        ) : (
                          <span className="text-sm text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {relativeTime(e.createdAt)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
