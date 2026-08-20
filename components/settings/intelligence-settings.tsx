"use client"

import { useState } from "react"
import useSWR from "swr"
import { BrainCircuit, Check, Copy, Loader2, PlugZap } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import {
  getIntelligenceSettings,
  testIntelligenceConnection,
  updateIntelligenceSettings,
  type IntelligenceSettingsInfo,
} from "@/app/actions/enrichment"
import { getAddonState, type AddonState } from "@/app/actions/billing"

/** The JSON body Nula expects Clay's HTTP API column to POST back. */
const CALLBACK_BODY_EXAMPLE = `{
  "_correlation_id": "{{_correlation_id}}",
  "_secret": "<your callback secret>",
  "industry": "{{Industry}}",
  "sub_industry": "{{Sub-industry}}",
  "employee_count": "{{Employee Count}}",
  "revenue_estimate": "{{Revenue}}",
  "company_type": "{{Company Type}}",
  "description": "{{Description}}",
  "tech_stack": "{{Tech Stack}}",
  "growth_signals": "{{Signals}}",
  "city": "{{City}}",
  "state": "{{State}}",
  "title": "{{Job Title}}",
  "seniority": "{{Seniority}}",
  "decision_maker": "{{Decision Maker}}",
  "work_email": "{{Work Email}}",
  "phone": "{{Phone}}",
  "domain": "{{Domain}}",
  "company_linkedin": "{{Company LinkedIn}}",
  "linkedin": "{{Person LinkedIn}}"
}`

function CopyField({ label, value, description }: { label: string; value: string; description?: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <Field>
      <FieldLabel>{label}</FieldLabel>
      <div className="flex gap-2">
        <Input readOnly value={value} className="font-mono text-xs" />
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label={`Copy ${label}`}
          onClick={() => {
            navigator.clipboard?.writeText(value)
            setCopied(true)
            toast.success("Copied")
            setTimeout(() => setCopied(false), 1500)
          }}
        >
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
        </Button>
      </div>
      {description ? <FieldDescription>{description}</FieldDescription> : null}
    </Field>
  )
}

export function IntelligenceSettings() {
  const { data: addon } = useSWR<AddonState>("addon-state", () => getAddonState())
  const { data, mutate } = useSWR<IntelligenceSettingsInfo>("intelligence-settings", () =>
    getIntelligenceSettings(),
  )
  const [webhookUrl, setWebhookUrl] = useState("")
  const [authToken, setAuthToken] = useState("")
  const [callbackSecret, setCallbackSecret] = useState("")
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)

  const enabled = Boolean(addon?.module.enabled)

  if (!enabled) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BrainCircuit className="size-5 text-nula-violet" />
            B2B Intelligence
          </CardTitle>
          <CardDescription>
            This module isn&apos;t enabled yet. Add it from Settings → Plan to start enriching your
            contacts and companies.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      await updateIntelligenceSettings({
        clayWebhookUrl: webhookUrl || undefined,
        clayAuthToken: authToken || undefined,
        clayCallbackSecret: callbackSecret || undefined,
      })
      setWebhookUrl("")
      setAuthToken("")
      setCallbackSecret("")
      toast.success("Connection saved")
      mutate()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save")
    } finally {
      setSaving(false)
    }
  }

  async function handleTest() {
    setTesting(true)
    try {
      const res = await testIntelligenceConnection()
      if (res.ok) toast.success(res.message)
      else toast.error(res.message)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not test connection")
    } finally {
      setTesting(false)
    }
  }

  async function handleAutoEnrich(next: boolean) {
    try {
      await updateIntelligenceSettings({ autoEnrichOnIntake: next })
      toast.success(next ? "Auto-enrich on for new leads" : "Auto-enrich off")
      mutate()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update")
    }
  }

  const usingShared = data?.platformConfigured && !data?.hasWebhook

  return (
    <div className="flex flex-col gap-6">
      {/* Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BrainCircuit className="size-5 text-nula-violet" />
            B2B Intelligence
          </CardTitle>
          <CardDescription>
            {addon?.module.creditsUsed ?? 0} of {addon?.module.creditLimit ?? 0} monthly enrichments
            used.{" "}
            {usingShared
              ? "You're using Nula's shared enrichment connection — nothing to set up. Advanced users can connect their own Clay workspace below."
              : data?.hasWebhook
                ? "Connected to your own Clay workspace."
                : "Connect your Clay workspace below to start enriching."}
          </CardDescription>
        </CardHeader>
      </Card>

      {/* How to connect Clay */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <PlugZap className="size-4 text-nula-violet" />
            How to connect Clay
          </CardTitle>
          <CardDescription>
            Nula sends each contact/company to a Clay table, Clay enriches it, then posts the results
            back to Nula. A one-time setup — about 10 minutes in Clay.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5 text-sm">
          <ol className="flex flex-col gap-3">
            <li className="flex gap-3">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-nula-violet/10 text-xs font-semibold text-nula-violet">1</span>
              <span>
                In Clay, create a table and add a <strong>Monitor webhook</strong> source. Copy the
                webhook URL it gives you and paste it into <strong>“Your Clay webhook URL”</strong> below.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-nula-violet/10 text-xs font-semibold text-nula-violet">2</span>
              <span>
                Nula sends these fields into that table:{" "}
                <code className="rounded bg-muted px-1 py-0.5 text-xs">first_name, last_name, company_name, email, phone, website, city, state</code>
                {" "}plus <code className="rounded bg-muted px-1 py-0.5 text-xs">_correlation_id</code> and{" "}
                <code className="rounded bg-muted px-1 py-0.5 text-xs">_callback_url</code>. Add Clay
                enrichment columns (company, headcount, revenue, title, etc.) against those inputs.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-nula-violet/10 text-xs font-semibold text-nula-violet">3</span>
              <span>
                Add a final <strong>HTTP API</strong> column in Clay set to <strong>POST</strong> to the
                callback URL below, with the JSON body shown below (map each value to your Clay
                columns). Include your callback secret so Nula knows the results are genuine.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-nula-violet/10 text-xs font-semibold text-nula-violet">4</span>
              <span>
                Save your connection below, click <strong>Test connection</strong>, then open any
                contact and hit <strong>Enrich</strong>.
              </span>
            </li>
          </ol>

          <CopyField
            label="Callback URL (paste into Clay's HTTP API column)"
            value={data?.callbackUrl ?? ""}
            description="Clay POSTs enriched results here. It's the same for every enrichment."
          />

          <div>
            <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              HTTP API column body
            </p>
            <pre className="overflow-x-auto rounded-lg border bg-muted/40 p-3 text-xs leading-relaxed">
              {CALLBACK_BODY_EXAMPLE}
            </pre>
            <p className="mt-1.5 text-xs text-muted-foreground">
              Only <code>_correlation_id</code> is required. Every other field is optional — map the
              ones your Clay table produces and Nula fills in the rest.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Connection form */}
      <Card>
        <CardHeader>
          <CardTitle>Your Clay connection</CardTitle>
          <CardDescription>
            Optional — leave blank to use Nula&apos;s shared connection. Secrets are stored securely
            and never shown again.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="flex flex-col gap-4">
            <Field>
              <FieldLabel htmlFor="clay-url">Your Clay webhook URL</FieldLabel>
              <Input
                id="clay-url"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder={data?.hasWebhook ? "•••••• (saved)" : "https://api.clay.com/v3/sources/webhook/…"}
                autoComplete="off"
              />
              <FieldDescription>From your Clay table&apos;s “Monitor webhook” source (step 1).</FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor="clay-token">Auth token (optional)</FieldLabel>
              <Input
                id="clay-token"
                value={authToken}
                onChange={(e) => setAuthToken(e.target.value)}
                placeholder="Only if you added an auth token to your Clay webhook"
                autoComplete="off"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="clay-secret">Callback secret</FieldLabel>
              <Input
                id="clay-secret"
                value={callbackSecret}
                onChange={(e) => setCallbackSecret(e.target.value)}
                placeholder={data?.hasCallbackSecret ? "•••••• (saved)" : "Make one up — paste the same value into Clay's _secret"}
                autoComplete="off"
              />
              <FieldDescription>
                Any secret string. Put the same value in the <code>_secret</code> field of Clay&apos;s
                HTTP API body (step 3) so Nula can verify results.
              </FieldDescription>
            </Field>
            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={saving}>
                {saving ? <Loader2 className="size-4 animate-spin" data-icon="inline-start" /> : null}
                Save connection
              </Button>
              <Button type="button" variant="outline" onClick={handleTest} disabled={testing}>
                {testing ? <Loader2 className="size-4 animate-spin" data-icon="inline-start" /> : <PlugZap data-icon="inline-start" />}
                Test connection
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Auto-enrich */}
      <Card>
        <CardHeader>
          <CardTitle>Auto-enrich new leads</CardTitle>
          <CardDescription>
            Automatically enrich every new lead as it comes in. Off by default to keep you in control
            of your monthly enrichment credits.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <Switch
              checked={data?.autoEnrichOnIntake ?? false}
              onCheckedChange={handleAutoEnrich}
              aria-label="Auto-enrich new leads"
            />
            <span className="text-sm text-muted-foreground">
              {data?.autoEnrichOnIntake ? "On — new leads are enriched automatically" : "Off"}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
