"use client"

import { useState } from "react"
import useSWR from "swr"
import { Check, Copy, Eye, EyeOff, KeyRound, Loader2, RefreshCw } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import {
  getApiAccess,
  rotateApiKey,
  setApiRequireKey,
  type LeadSourceInfo,
} from "@/app/actions/lead-sources"
import { canManageSettings } from "@/lib/roles"
import { useSessionUser } from "@/lib/session-context"

function CopyField({ label, value, mono = true }: { label: string; value: string; mono?: boolean }) {
  const [copied, setCopied] = useState(false)
  return (
    <Field>
      <FieldLabel>{label}</FieldLabel>
      <div className="flex gap-2">
        <Input readOnly value={value} className={mono ? "font-mono text-xs" : undefined} />
        <Button
          type="button"
          variant="outline"
          className="shrink-0"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(value)
              setCopied(true)
              toast.success(`${label} copied`)
              setTimeout(() => setCopied(false), 1500)
            } catch {
              toast.error("Could not copy")
            }
          }}
        >
          {copied ? <Check /> : <Copy />}
        </Button>
      </div>
    </Field>
  )
}

export function ApiAccessSettings() {
  const me = useSessionUser()
  const isAdmin = canManageSettings(me.role)
  const { data, isLoading, mutate } = useSWR<LeadSourceInfo | null>(
    isAdmin ? "api-access" : null,
    () => getApiAccess(),
  )
  const [reveal, setReveal] = useState(false)
  const [busy, setBusy] = useState(false)

  if (!isAdmin) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="size-4 text-muted-foreground" />
            API access
          </CardTitle>
          <CardDescription>Only admins can manage API access.</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const endpoint = data?.endpointUrl ?? ""
  const apiKey = data?.apiKey ?? ""
  const requireKey = data?.requireKey ?? false
  const maskedKey = apiKey ? `${apiKey.slice(0, 9)}${"•".repeat(20)}` : ""

  async function handleRotate() {
    if (!confirm("Generate a new API key? The old key will stop working immediately.")) return
    setBusy(true)
    try {
      const updated = await rotateApiKey()
      await mutate(updated, { revalidate: false })
      setReveal(true)
      toast.success("New API key generated")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not rotate key")
    } finally {
      setBusy(false)
    }
  }

  async function handleToggle(next: boolean) {
    setBusy(true)
    try {
      const updated = await setApiRequireKey(next)
      await mutate(updated, { revalidate: false })
      toast.success(next ? "API key now required" : "API key requirement turned off")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update setting")
    } finally {
      setBusy(false)
    }
  }

  const curl = requireKey
    ? `curl -X POST "${endpoint}" \\
  -H "Authorization: Bearer ${reveal ? apiKey : "YOUR_API_KEY"}" \\
  -H "Content-Type: application/json" \\
  -d '{"name":"Jane Doe","email":"jane@example.com","phone":"555-1234","message":"Interested!"}'`
    : `curl -X POST "${endpoint}" \\
  -H "Content-Type: application/json" \\
  -d '{"name":"Jane Doe","email":"jane@example.com","phone":"555-1234","message":"Interested!"}'`

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <KeyRound className="size-4 text-muted-foreground" />
          API access (Zapier & integrations)
        </CardTitle>
        <CardDescription>
          Post leads into Nula from Zapier, Make, your website, or any tool. Quick to set up by
          default; turn on the API key below when you want to lock it down.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <>
            <CopyField label="Endpoint URL (POST)" value={endpoint} />

            <Field>
              <FieldLabel>API key</FieldLabel>
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={reveal ? apiKey : maskedKey}
                  className="font-mono text-xs"
                />
                <Button
                  type="button"
                  variant="outline"
                  className="shrink-0"
                  onClick={() => setReveal((r) => !r)}
                  aria-label={reveal ? "Hide API key" : "Reveal API key"}
                >
                  {reveal ? <EyeOff /> : <Eye />}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="shrink-0"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(apiKey)
                      toast.success("API key copied")
                    } catch {
                      toast.error("Could not copy")
                    }
                  }}
                >
                  <Copy />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="shrink-0"
                  onClick={handleRotate}
                  disabled={busy}
                >
                  {busy ? <Loader2 className="animate-spin" /> : <RefreshCw />}
                  Rotate
                </Button>
              </div>
              <FieldDescription>Keep this secret. Rotating it invalidates the old key.</FieldDescription>
            </Field>

            <div className="flex items-start justify-between gap-4 rounded-lg border p-4">
              <div>
                <p className="text-sm font-medium">Require API key (recommended for production)</p>
                <p className="text-sm text-muted-foreground">
                  Off by default for the quickest setup — anyone with the endpoint URL can post a
                  lead (spam‑protected and rate‑limited). Turn on to require the API key on every
                  request.
                </p>
              </div>
              <Switch checked={requireKey} onCheckedChange={handleToggle} disabled={busy} />
            </div>

            <div className="flex flex-col gap-2 rounded-lg bg-muted/50 p-4">
              <p className="text-sm font-medium">Set it up in Zapier (2 minutes)</p>
              <ol className="ml-4 list-decimal text-sm text-muted-foreground">
                <li>Add a “Webhooks by Zapier” action → “POST”.</li>
                <li>
                  URL: paste your <span className="font-medium text-foreground">Endpoint URL</span>{" "}
                  above. Payload type: JSON.
                </li>
                <li>
                  Data: map <code className="text-foreground">name</code>,{" "}
                  <code className="text-foreground">email</code>,{" "}
                  <code className="text-foreground">phone</code>,{" "}
                  <code className="text-foreground">message</code> from the trigger.
                </li>
                <li>
                  {requireKey ? (
                    <>
                      Headers: add{" "}
                      <code className="text-foreground">Authorization</code> ={" "}
                      <code className="text-foreground">Bearer YOUR_API_KEY</code>.
                    </>
                  ) : (
                    <>No auth needed — but you can turn on “Require API key” and add an Authorization header for security.</>
                  )}
                </li>
              </ol>
              <p className="mt-1 text-sm font-medium">Or test from a terminal:</p>
              <pre className="overflow-x-auto rounded-md bg-background p-3 text-xs">
                <code>{curl}</code>
              </pre>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
