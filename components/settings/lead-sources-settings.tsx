"use client"

import Link from "next/link"
import { useState } from "react"
import useSWR from "swr"
import { Check, Copy, Loader2, Plus, RefreshCw } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  createCallSource,
  createEmailSource,
  createWebFormSource,
  createWebhookSource,
  getLeadEvents,
  getLeadSourceMetrics,
  getLeadSources,
  retryLeadEvent,
  type LeadEventInfo,
  type LeadSourceInfo,
} from "@/app/actions/lead-sources"
import type { SourceMetric } from "@/lib/leads/sources"
import { PROVIDER_PRESETS, providerPreset } from "@/lib/leads/providers"
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

type Data = {
  sources: LeadSourceInfo[]
  events: LeadEventInfo[]
  metrics: Record<string, SourceMetric>
}

async function fetchData(): Promise<Data> {
  const [sources, events, metrics] = await Promise.all([
    getLeadSources(),
    getLeadEvents(),
    getLeadSourceMetrics(),
  ])
  return { sources, events, metrics }
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
  const metrics = data?.metrics ?? {}
  const webForms = sources.filter((s) => s.channel === "web_form" && s.publicKey)
  const emailSources = sources.filter((s) => s.channel === "email" && s.publicKey)
  const callSources = sources.filter((s) => s.channel === "call" && s.publicKey)
  const webhookSources = sources.filter((s) => s.channel === "webhook" && s.publicKey)

  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [name, setName] = useState("")
  const [successMessage, setSuccessMessage] = useState("")

  const [showEmailForm, setShowEmailForm] = useState(false)
  const [savingEmail, setSavingEmail] = useState(false)
  const [emailName, setEmailName] = useState("")

  const [showCallForm, setShowCallForm] = useState(false)
  const [savingCall, setSavingCall] = useState(false)
  const [callName, setCallName] = useState("")

  const [showHookForm, setShowHookForm] = useState(false)
  const [savingHook, setSavingHook] = useState(false)
  const [hookName, setHookName] = useState("")
  const [hookProvider, setHookProvider] = useState("generic")
  const [hookSigned, setHookSigned] = useState(true)

  async function handleCreateHook() {
    if (!hookName.trim()) {
      toast.error("Give the webhook a name")
      return
    }
    setSavingHook(true)
    try {
      await createWebhookSource({ name: hookName, provider: hookProvider, signed: hookSigned })
      toast.success("Webhook source created")
      setHookName("")
      setHookProvider("generic")
      setHookSigned(true)
      setShowHookForm(false)
      mutate()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create webhook")
    } finally {
      setSavingHook(false)
    }
  }

  async function handleCreateEmail() {
    if (!emailName.trim()) {
      toast.error("Give the email source a name")
      return
    }
    setSavingEmail(true)
    try {
      await createEmailSource({ name: emailName })
      toast.success("Inbound email source created")
      setEmailName("")
      setShowEmailForm(false)
      mutate()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create email source")
    } finally {
      setSavingEmail(false)
    }
  }

  async function handleCreateCall() {
    if (!callName.trim()) {
      toast.error("Give the call source a name")
      return
    }
    setSavingCall(true)
    try {
      await createCallSource({ name: callName })
      toast.success("Call tracking source created")
      setCallName("")
      setShowCallForm(false)
      mutate()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create call source")
    } finally {
      setSavingCall(false)
    }
  }

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

  const [retrying, setRetrying] = useState<string | null>(null)
  async function handleRetry(eventId: string) {
    setRetrying(eventId)
    try {
      await retryLeadEvent(eventId)
      toast.success("Lead event reprocessed")
      mutate()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Retry failed")
    } finally {
      setRetrying(null)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Lead sources</CardTitle>
          <CardDescription>
            Every channel leads flow in through, with processed/failed volume per source. Sources are
            created automatically the first time a channel receives a lead.
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
                  <TableHead className="text-right">Processed</TableHead>
                  <TableHead className="text-right">Failed</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-sm text-muted-foreground">
                      Loading…
                    </TableCell>
                  </TableRow>
                ) : sources.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-sm text-muted-foreground">
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
                      <TableCell className="text-right tabular-nums">
                        {metrics[s.id]?.processed ?? 0}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {metrics[s.id]?.failed ? (
                          <span className="text-destructive">{metrics[s.id].failed}</span>
                        ) : (
                          0
                        )}
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
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>Inbound email</CardTitle>
            <CardDescription>
              Forward or auto‑route emails to a dedicated address and each one becomes a lead plus an
              inbox conversation — deduped, scored, and routed.
            </CardDescription>
          </div>
          {isAdmin ? (
            <Button size="sm" onClick={() => setShowEmailForm((s) => !s)} disabled={savingEmail}>
              <Plus className="size-4" />
              New email source
            </Button>
          ) : null}
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {showEmailForm && isAdmin ? (
            <div className="flex flex-col gap-3 rounded-lg border bg-muted/30 p-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="em-name">Source name</Label>
                <Input
                  id="em-name"
                  value={emailName}
                  onChange={(e) => setEmailName(e.target.value)}
                  placeholder="Support inbox"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setShowEmailForm(false)} disabled={savingEmail}>
                  Cancel
                </Button>
                <Button onClick={handleCreateEmail} disabled={savingEmail}>
                  {savingEmail ? <Loader2 className="size-4 animate-spin" /> : null}
                  Create source
                </Button>
              </div>
            </div>
          ) : null}

          {emailSources.length === 0 ? (
            <p className="rounded-lg border p-4 text-center text-sm text-muted-foreground">
              No inbound email sources yet. Create one to get a dedicated lead address.
            </p>
          ) : (
            emailSources.map((s) => (
              <div key={s.id} className="flex flex-col gap-3 rounded-lg border p-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{s.name}</span>
                  <Badge variant={s.enabled ? "default" : "secondary"}>
                    {s.enabled ? "Active" : "Disabled"}
                  </Badge>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs text-muted-foreground">Inbound address</Label>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 truncate rounded bg-muted px-2 py-1.5 font-mono text-xs">
                      {s.inboundAddress}
                    </code>
                    <CopyButton text={s.inboundAddress} label="Copy" />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Point your email provider&apos;s inbound parse (Resend, Postmark, SendGrid,
                    Mailgun) at <code className="font-mono">/api/inbound/email</code>, or forward mail
                    to this address.
                  </p>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>Phone calls</CardTitle>
            <CardDescription>
              Point a call‑tracking provider (Twilio, CallRail) at this webhook. Every inbound or
              missed call becomes a lead — with the recording and transcription saved as an activity.
            </CardDescription>
          </div>
          {isAdmin ? (
            <Button size="sm" onClick={() => setShowCallForm((s) => !s)} disabled={savingCall}>
              <Plus className="size-4" />
              New call source
            </Button>
          ) : null}
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {showCallForm && isAdmin ? (
            <div className="flex flex-col gap-3 rounded-lg border bg-muted/30 p-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="call-name">Source name</Label>
                <Input
                  id="call-name"
                  value={callName}
                  onChange={(e) => setCallName(e.target.value)}
                  placeholder="Main tracking number"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setShowCallForm(false)} disabled={savingCall}>
                  Cancel
                </Button>
                <Button onClick={handleCreateCall} disabled={savingCall}>
                  {savingCall ? <Loader2 className="size-4 animate-spin" /> : null}
                  Create source
                </Button>
              </div>
            </div>
          ) : null}

          {callSources.length === 0 ? (
            <p className="rounded-lg border p-4 text-center text-sm text-muted-foreground">
              No call sources yet. Create one to get a call‑tracking webhook URL.
            </p>
          ) : (
            callSources.map((s) => (
              <div key={s.id} className="flex flex-col gap-3 rounded-lg border p-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{s.name}</span>
                  <Badge variant={s.enabled ? "default" : "secondary"}>
                    {s.enabled ? "Active" : "Disabled"}
                  </Badge>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs text-muted-foreground">Call webhook URL</Label>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 truncate rounded bg-muted px-2 py-1.5 font-mono text-xs">
                      {s.callWebhookUrl}
                    </code>
                    <CopyButton text={s.callWebhookUrl} label="Copy" />
                  </div>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>Webhooks &amp; integrations</CardTitle>
            <CardDescription>
              Connect Zapier, Make, Typeform, Calendly, Facebook Lead Ads and more. Pick a provider
              preset for its field mapping, and optionally require a signed (HMAC) payload.
            </CardDescription>
          </div>
          {isAdmin ? (
            <Button size="sm" onClick={() => setShowHookForm((s) => !s)} disabled={savingHook}>
              <Plus className="size-4" />
              New webhook
            </Button>
          ) : null}
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {showHookForm && isAdmin ? (
            <div className="flex flex-col gap-3 rounded-lg border bg-muted/30 p-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="hook-name">Name</Label>
                <Input
                  id="hook-name"
                  value={hookName}
                  onChange={(e) => setHookName(e.target.value)}
                  placeholder="Typeform contact form"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Provider preset</Label>
                <Select value={hookProvider} onValueChange={(v) => v && setHookProvider(v)}>
                  <SelectTrigger>
                    <SelectValue>
                      {(v) =>
                        PROVIDER_PRESETS.find((p) => p.id === (v as string))?.label ?? "Generic"
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {PROVIDER_PRESETS.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">{providerPreset(hookProvider)?.hint}</p>
              </div>
              <div className="flex items-center justify-between rounded-md border p-3">
                <div>
                  <p className="text-sm font-medium">Require signed payloads</p>
                  <p className="text-xs text-muted-foreground">
                    Verify an HMAC <code className="font-mono">X-Nula-Signature</code> header.
                  </p>
                </div>
                <Switch checked={hookSigned} onCheckedChange={setHookSigned} />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setShowHookForm(false)} disabled={savingHook}>
                  Cancel
                </Button>
                <Button onClick={handleCreateHook} disabled={savingHook}>
                  {savingHook ? <Loader2 className="size-4 animate-spin" /> : null}
                  Create webhook
                </Button>
              </div>
            </div>
          ) : null}

          {webhookSources.length === 0 ? (
            <p className="rounded-lg border p-4 text-center text-sm text-muted-foreground">
              No webhook integrations yet. Create one to connect Zapier or a provider.
            </p>
          ) : (
            webhookSources.map((s) => (
              <div key={s.id} className="flex flex-col gap-3 rounded-lg border p-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{s.name}</span>
                  <Badge variant={s.enabled ? "default" : "secondary"}>
                    {s.enabled ? "Active" : "Disabled"}
                  </Badge>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs text-muted-foreground">Webhook URL</Label>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 truncate rounded bg-muted px-2 py-1.5 font-mono text-xs">
                      {s.endpointUrl}
                    </code>
                    <CopyButton text={s.endpointUrl} label="Copy" />
                  </div>
                </div>
                {s.secret ? (
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs text-muted-foreground">Signing secret</Label>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 truncate rounded bg-muted px-2 py-1.5 font-mono text-xs">
                        {s.secret}
                      </code>
                      <CopyButton text={s.secret} label="Copy" />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Send <code className="font-mono">X-Nula-Signature: sha256=HMAC_SHA256(body,
                      secret)</code>.
                    </p>
                  </div>
                ) : null}
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
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
                      Loading…
                    </TableCell>
                  </TableRow>
                ) : events.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
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
                      <TableCell className="text-right">
                        {isAdmin && e.status === "failed" ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRetry(e.id)}
                            disabled={retrying === e.id}
                          >
                            {retrying === e.id ? (
                              <Loader2 className="size-4 animate-spin" />
                            ) : (
                              <RefreshCw className="size-4" />
                            )}
                            Retry
                          </Button>
                        ) : (
                          <span className="text-sm text-muted-foreground">—</span>
                        )}
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
