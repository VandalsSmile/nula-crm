"use client"

import { useState } from "react"
import useSWR from "swr"
import { Check, ExternalLink, Loader2, Mail, Send } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  getEmailSettings,
  sendTestEmail,
  updateEmailSettings,
  type EmailSettingsInfo,
} from "@/app/actions/email-settings"
import { canManageSettings } from "@/lib/roles"
import { useSessionUser } from "@/lib/session-context"

function ExternalLinkRow({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
    >
      {children}
      <ExternalLink className="size-3" />
    </a>
  )
}

export function EmailSettings() {
  const me = useSessionUser()
  const isAdmin = canManageSettings(me.role)
  const { data, isLoading, mutate } = useSWR<EmailSettingsInfo>(
    isAdmin ? "email-settings" : null,
    () => getEmailSettings(),
  )

  const [fromName, setFromName] = useState<string | null>(null)
  const [fromEmail, setFromEmail] = useState<string | null>(null)
  const [apiKey, setApiKey] = useState("")
  const [saving, setSaving] = useState(false)
  const [testTo, setTestTo] = useState(me.email ?? "")
  const [testing, setTesting] = useState(false)

  if (!isAdmin) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="size-4 text-muted-foreground" />
            Email sending
          </CardTitle>
          <CardDescription>Only admins can manage email sending.</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  // Fall back to the saved values until the admin edits a field.
  const nameValue = fromName ?? data?.fromName ?? ""
  const emailValue = fromEmail ?? data?.fromEmail ?? ""

  async function handleSave() {
    setSaving(true)
    try {
      const updated = await updateEmailSettings({
        fromName: nameValue,
        fromEmail: emailValue,
        apiKey: apiKey.trim() || undefined,
      })
      await mutate(updated, { revalidate: false })
      setApiKey("")
      setFromName(null)
      setFromEmail(null)
      toast.success("Email settings saved")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save email settings")
    } finally {
      setSaving(false)
    }
  }

  async function handleDisconnect() {
    if (!confirm("Disconnect your Resend account? Campaign emails will fall back to Nula's shared sender until you reconnect.")) return
    setSaving(true)
    try {
      const updated = await updateEmailSettings({ clearApiKey: true })
      await mutate(updated, { revalidate: false })
      setApiKey("")
      toast.success("Resend disconnected")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not disconnect")
    } finally {
      setSaving(false)
    }
  }

  async function handleTest() {
    setTesting(true)
    try {
      const res = await sendTestEmail(testTo)
      if (res.ok) toast.success(`Test email sent to ${testTo} from ${res.from}`)
      else toast.error(res.error || "Test email failed")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send test email")
    } finally {
      setTesting(false)
    }
  }

  const usingWorkspace = data?.usingWorkspace ?? false
  const platformConfigured = data?.platformConfigured ?? false

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="size-4 text-muted-foreground" />
          Email sending (Resend)
        </CardTitle>
        <CardDescription>
          Connect your own Resend account so campaign emails send from your verified domain. Until
          you do, campaigns use Nula&apos;s shared sender.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <>
            {/* Status */}
            <div
              className={
                usingWorkspace
                  ? "flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-300"
                  : "rounded-lg border bg-muted/40 px-3 py-2 text-sm text-muted-foreground"
              }
            >
              {usingWorkspace ? (
                <>
                  <Check className="size-4 shrink-0" />
                  Connected — campaigns send from{" "}
                  <span className="font-medium">
                    {nameValue ? `${nameValue} <${emailValue}>` : emailValue}
                  </span>
                </>
              ) : platformConfigured ? (
                "Using Nula's shared sender. Connect Resend below to send from your own domain (recommended for deliverability)."
              ) : (
                "No sender configured yet. Connect Resend below to send campaign emails."
              )}
            </div>

            {/* Setup steps */}
            <div className="flex flex-col gap-2 rounded-lg bg-muted/50 p-4">
              <p className="text-sm font-medium">Set up Resend (about 5 minutes)</p>
              <ol className="ml-4 flex list-decimal flex-col gap-1 text-sm text-muted-foreground">
                <li>
                  Create a free account at{" "}
                  <ExternalLinkRow href="https://resend.com/signup">resend.com</ExternalLinkRow>.
                </li>
                <li>
                  Add and verify your sending domain at{" "}
                  <ExternalLinkRow href="https://resend.com/domains">Resend → Domains</ExternalLinkRow>{" "}
                  (add the DNS records they show you at your domain host).
                </li>
                <li>
                  Create an API key at{" "}
                  <ExternalLinkRow href="https://resend.com/api-keys">
                    Resend → API Keys
                  </ExternalLinkRow>{" "}
                  and paste it below.
                </li>
                <li>
                  Set your From address to an email on your verified domain (e.g.{" "}
                  <code className="text-foreground">hello@yourdomain.com</code>), then send a test.
                </li>
              </ol>
            </div>

            {/* From fields */}
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel>From name</FieldLabel>
                <Input
                  placeholder="Acme Wellness"
                  value={nameValue}
                  onChange={(e) => setFromName(e.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel>From email</FieldLabel>
                <Input
                  type="email"
                  placeholder="hello@yourdomain.com"
                  value={emailValue}
                  onChange={(e) => setFromEmail(e.target.value)}
                />
                <FieldDescription>Must be on a domain you verified in Resend.</FieldDescription>
              </Field>
            </div>

            {/* API key */}
            <Field>
              <FieldLabel>Resend API key</FieldLabel>
              <Input
                type="password"
                autoComplete="off"
                placeholder={data?.hasApiKey ? "•••••••••• (saved — enter a new key to replace)" : "re_..."}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
              <FieldDescription>
                Stored securely and used only to send your campaign emails.{" "}
                {data?.hasApiKey ? "A key is already saved; leave blank to keep it." : null}
              </FieldDescription>
            </Field>

            <div className="flex flex-wrap items-center gap-2">
              <Button onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="animate-spin" /> : <Check />}
                Save
              </Button>
              {data?.hasApiKey ? (
                <Button variant="outline" onClick={handleDisconnect} disabled={saving}>
                  Disconnect Resend
                </Button>
              ) : null}
            </div>

            {/* Test email */}
            <div className="flex flex-col gap-2 rounded-lg border p-4">
              <p className="text-sm font-medium">Send a test email</p>
              <p className="text-sm text-muted-foreground">
                Verify your setup by sending a test to yourself. Save any changes above first.
              </p>
              <div className="flex flex-wrap gap-2">
                <Input
                  type="email"
                  value={testTo}
                  onChange={(e) => setTestTo(e.target.value)}
                  placeholder="you@example.com"
                  className="max-w-xs"
                />
                <Button variant="outline" onClick={handleTest} disabled={testing || !testTo.trim()}>
                  {testing ? <Loader2 className="animate-spin" /> : <Send />}
                  Send test
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
