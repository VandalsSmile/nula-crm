"use client"

import { useState } from "react"
import useSWR from "swr"
import { Check, Copy, Loader2, Mail } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  connectMyEmail,
  disconnectMyEmail,
  getMyEmailConnection,
  updateMyEmailConnection,
  type EmailConnection,
} from "@/app/actions/email-connection"

const MODE_LABELS: Record<EmailConnection["mode"], string> = {
  contacts_only: "Only log emails with existing contacts",
  all: "Log all emails (create contacts if new)",
}

export function EmailConnectionSettings() {
  const { data, isLoading, mutate } = useSWR<EmailConnection | null>("my-email-connection", () =>
    getMyEmailConnection(),
  )
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)
  const [ownedDraft, setOwnedDraft] = useState<string | null>(null)

  const connection = data ?? null
  const ownedValue = ownedDraft ?? connection?.ownedEmails.join(", ") ?? ""

  async function handleConnect() {
    setBusy(true)
    try {
      await connectMyEmail()
      toast.success("Email logging is on — copy your address below")
      mutate()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not set up email logging")
    } finally {
      setBusy(false)
    }
  }

  async function handleDisconnect() {
    setBusy(true)
    try {
      await disconnectMyEmail()
      toast.success("Email logging turned off")
      setOwnedDraft(null)
      mutate()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not turn off email logging")
    } finally {
      setBusy(false)
    }
  }

  async function handleMode(mode: EmailConnection["mode"]) {
    try {
      await updateMyEmailConnection({ mode })
      toast.success("Saved")
      mutate()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save")
    }
  }

  async function handleSaveOwned() {
    try {
      const list = ownedValue.split(",").map((e) => e.trim()).filter(Boolean)
      await updateMyEmailConnection({ ownedEmails: list })
      toast.success("Saved your addresses")
      setOwnedDraft(null)
      mutate()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save")
    }
  }

  function copyAddress() {
    if (!connection) return
    navigator.clipboard?.writeText(connection.address)
    setCopied(true)
    toast.success("Address copied")
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="size-4 text-muted-foreground" />
          Log your email into the CRM
        </CardTitle>
        <CardDescription>
          Get a private address to BCC (or auto-forward) when you email contacts. Nula logs the
          message on the matching contact&apos;s timeline and Inbox.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : !connection ? (
          <Button className="w-fit" onClick={handleConnect} disabled={busy}>
            {busy ? <Loader2 className="animate-spin" /> : <Mail />}
            Turn on email logging
          </Button>
        ) : (
          <>
            <Field>
              <FieldLabel htmlFor="dropbox-address">Your email logging address</FieldLabel>
              <InputGroup>
                <InputGroupInput id="dropbox-address" readOnly value={connection.address} />
                <InputGroupAddon align="inline-end">
                  <InputGroupButton onClick={copyAddress} aria-label="Copy address">
                    {copied ? <Check /> : <Copy />}
                  </InputGroupButton>
                </InputGroupAddon>
              </InputGroup>
              <FieldDescription>
                BCC this address when emailing a contact, or set a forwarding rule in Gmail/Outlook.
                Keep it private — anyone with it can add mail to your CRM.
              </FieldDescription>
            </Field>

            <Field className="sm:max-w-md">
              <FieldLabel htmlFor="dropbox-mode">What to log</FieldLabel>
              <Select value={connection.mode} onValueChange={(v) => v && handleMode(v as EmailConnection["mode"])}>
                <SelectTrigger id="dropbox-mode">
                  <SelectValue>{(v: string) => MODE_LABELS[v as EmailConnection["mode"]]}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="contacts_only">{MODE_LABELS.contacts_only}</SelectItem>
                  <SelectItem value="all">{MODE_LABELS.all}</SelectItem>
                </SelectContent>
              </Select>
            </Field>

            <Field className="sm:max-w-md">
              <FieldLabel htmlFor="dropbox-owned">Your email addresses</FieldLabel>
              <div className="flex gap-2">
                <Input
                  id="dropbox-owned"
                  value={ownedValue}
                  onChange={(e) => setOwnedDraft(e.target.value)}
                  placeholder="you@company.com, you@gmail.com"
                />
                <Button
                  variant="outline"
                  onClick={handleSaveOwned}
                  disabled={ownedDraft === null || ownedDraft === connection.ownedEmails.join(", ")}
                >
                  Save
                </Button>
              </div>
              <FieldDescription>
                Comma-separated. Used to tell your sent mail from received mail.
              </FieldDescription>
            </Field>

            <Button variant="outline" className="w-fit" onClick={handleDisconnect} disabled={busy}>
              Turn off email logging
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  )
}
