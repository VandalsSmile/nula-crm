"use client"

import { useState } from "react"
import useSWR from "swr"
import { BrainCircuit, Loader2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import {
  getIntelligenceSettings,
  updateIntelligenceSettings,
  type IntelligenceSettingsInfo,
} from "@/app/actions/enrichment"
import { getAddonState, type AddonState } from "@/app/actions/billing"

export function IntelligenceSettings() {
  const { data: addon } = useSWR<AddonState>("addon-state", () => getAddonState())
  const { data, mutate } = useSWR<IntelligenceSettingsInfo>("intelligence-settings", () =>
    getIntelligenceSettings(),
  )
  const [webhookUrl, setWebhookUrl] = useState("")
  const [authToken, setAuthToken] = useState("")
  const [callbackSecret, setCallbackSecret] = useState("")
  const [saving, setSaving] = useState(false)

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

  async function handleAutoEnrich(next: boolean) {
    try {
      await updateIntelligenceSettings({ autoEnrichOnIntake: next })
      toast.success(next ? "Auto-enrich on for new leads" : "Auto-enrich off")
      mutate()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update")
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BrainCircuit className="size-5 text-nula-violet" />
            B2B Intelligence
          </CardTitle>
          <CardDescription>
            {addon?.module.creditsUsed ?? 0} of {addon?.module.creditLimit ?? 0} monthly enrichments
            used. Enrichment runs behind the scenes — connect your data source below (optional; a
            shared connection is used if left blank).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="flex flex-col gap-4">
            <Field>
              <FieldLabel htmlFor="clay-url">Data source webhook URL</FieldLabel>
              <Input
                id="clay-url"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder={data?.hasWebhook ? "•••••• (saved)" : "https://…"}
                autoComplete="off"
              />
              <FieldDescription>
                Where Nula sends records to be enriched. Stored securely and never shown again.
              </FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor="clay-token">Auth token (optional)</FieldLabel>
              <Input
                id="clay-token"
                value={authToken}
                onChange={(e) => setAuthToken(e.target.value)}
                placeholder="Bearer token, if your source requires one"
                autoComplete="off"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="clay-secret">Callback secret</FieldLabel>
              <Input
                id="clay-secret"
                value={callbackSecret}
                onChange={(e) => setCallbackSecret(e.target.value)}
                placeholder={data?.hasCallbackSecret ? "•••••• (saved)" : "Shared secret to verify results"}
                autoComplete="off"
              />
              <FieldDescription>
                Verifies enriched results are genuine before Nula applies them.
              </FieldDescription>
            </Field>
            <Button type="submit" disabled={saving} className="w-fit">
              {saving ? <Loader2 className="size-4 animate-spin" data-icon="inline-start" /> : null}
              Save connection
            </Button>
          </form>
        </CardContent>
      </Card>

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
