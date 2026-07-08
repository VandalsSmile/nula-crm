"use client"

import Link from "next/link"
import { useState } from "react"
import useSWR from "swr"
import { Check, Copy, Loader2, Plus } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  createWebFormSource,
  getLeadEvents,
  getLeadSources,
  type LeadEventInfo,
  type LeadSourceInfo,
} from "@/app/actions/lead-sources"
import { relativeTime } from "@/lib/format"
import { contactPath } from "@/lib/routes"
import { useSessionUser } from "@/lib/session-context"

function embedSnippet(url: string): string {
  return `<form action="${url}" method="POST">
  <input name="name" placeholder="Your name" required />
  <input name="email" type="email" placeholder="Email" required />
  <input name="phone" placeholder="Phone" />
  <textarea name="message" placeholder="How can we help?"></textarea>
  <!-- spam honeypot: keep hidden, do not remove -->
  <input name="company_website" tabindex="-1" autocomplete="off" aria-hidden="true"
    style="position:absolute;left:-9999px" />
  <button type="submit">Send</button>
</form>`
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text)
          setCopied(true)
          setTimeout(() => setCopied(false), 1500)
        } catch {
          toast.error("Could not copy")
        }
      }}
    >
      {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
      {copied ? "Copied" : label}
    </Button>
  )
}

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
  const me = useSessionUser()
  const isAdmin = me.role === "Admin"
  const { data, isLoading, mutate } = useSWR<Data>("lead-sources", fetchData)
  const sources = data?.sources ?? []
  const events = data?.events ?? []
  const webForms = sources.filter((s) => s.channel === "web_form" && s.publicKey)

  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [name, setName] = useState("")
  const [successMessage, setSuccessMessage] = useState("")

  async function handleCreate() {
    if (!name.trim()) {
      toast.error("Give the form a name")
      return
    }
    setSaving(true)
    try {
      await createWebFormSource({ name, successMessage })
      toast.success("Web form source created")
      setName("")
      setSuccessMessage("")
      setShowForm(false)
      mutate()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create form")
    } finally {
      setSaving(false)
    }
  }

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
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>Embeddable web forms</CardTitle>
            <CardDescription>
              Create a form source, then drop its HTML snippet on any website. Submissions flow
              straight into the CRM — deduped, scored, and routed. Includes a spam honeypot.
            </CardDescription>
          </div>
          {isAdmin ? (
            <Button size="sm" onClick={() => setShowForm((s) => !s)} disabled={saving}>
              <Plus className="size-4" />
              New web form
            </Button>
          ) : null}
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {showForm && isAdmin ? (
            <div className="flex flex-col gap-3 rounded-lg border bg-muted/30 p-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="wf-name">Form name</Label>
                <Input
                  id="wf-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Contact page form"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="wf-success">Success message (optional)</Label>
                <Input
                  id="wf-success"
                  value={successMessage}
                  onChange={(e) => setSuccessMessage(e.target.value)}
                  placeholder="Thanks! We'll be in touch soon."
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setShowForm(false)} disabled={saving}>
                  Cancel
                </Button>
                <Button onClick={handleCreate} disabled={saving}>
                  {saving ? <Loader2 className="size-4 animate-spin" /> : null}
                  Create form
                </Button>
              </div>
            </div>
          ) : null}

          {webForms.length === 0 ? (
            <p className="rounded-lg border p-4 text-center text-sm text-muted-foreground">
              No embeddable forms yet. Create one to get a copy-paste snippet.
            </p>
          ) : (
            webForms.map((s) => (
              <div key={s.id} className="flex flex-col gap-3 rounded-lg border p-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{s.name}</span>
                  <Badge variant={s.enabled ? "default" : "secondary"}>
                    {s.enabled ? "Active" : "Disabled"}
                  </Badge>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs text-muted-foreground">Endpoint URL</Label>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 truncate rounded bg-muted px-2 py-1.5 font-mono text-xs">
                      {s.endpointUrl}
                    </code>
                    <CopyButton text={s.endpointUrl} label="Copy URL" />
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-muted-foreground">Embed snippet</Label>
                    <CopyButton text={embedSnippet(s.endpointUrl)} label="Copy code" />
                  </div>
                  <pre className="max-h-48 overflow-auto rounded-md bg-muted p-3 font-mono text-xs">
                    {embedSnippet(s.endpointUrl)}
                  </pre>
                </div>
              </div>
            ))
          )}
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
