"use client"

import { useState } from "react"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field"
import { connectLacrm } from "@/app/actions/lacrm"

const LACRM_API_SETTINGS_URL = "https://account.lessannoyingcrm.com/app/Settings/Api"

export function LacrmConnectDialog({
  open,
  onOpenChange,
  clientId,
  clientName,
  onConnected,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  clientId: string
  clientName: string
  onConnected?: () => void
}) {
  const [apiKey, setApiKey] = useState("")
  const [connecting, setConnecting] = useState(false)

  async function handleConnect() {
    setConnecting(true)
    try {
      const result = await connectLacrm(clientId, apiKey)
      if (!result.ok) {
        toast.error("Could not connect LACRM", { description: result.message })
        return
      }

      toast.success("Less Annoying CRM connected", { description: result.message })
      setApiKey("")
      onOpenChange(false)
      onConnected?.()
    } catch (error) {
      toast.error("Could not connect LACRM", {
        description: error instanceof Error ? error.message : undefined,
      })
    } finally {
      setConnecting(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!connecting) onOpenChange(next)
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Connect Less Annoying CRM</DialogTitle>
          <DialogDescription>
            Paste an API key from {clientName}&apos;s LACRM account. Nula CRM encrypts the key and
            uses it only on the server to load groups and log sends.
          </DialogDescription>
        </DialogHeader>

        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="lacrm-api-key">API key</FieldLabel>
            <Input
              id="lacrm-api-key"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Paste the key from LACRM Programmer API settings"
              autoComplete="off"
              disabled={connecting}
            />
            <FieldDescription>
              Create a key in LACRM under Settings → Programmer API. Grant read access to contacts
              and groups, plus create access for notes.{" "}
              <a
                href={LACRM_API_SETTINGS_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline-offset-4 hover:underline"
              >
                Open LACRM API settings
              </a>
            </FieldDescription>
          </Field>
        </FieldGroup>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={connecting}>
            Cancel
          </Button>
          <Button onClick={handleConnect} disabled={connecting || !apiKey.trim()}>
            {connecting ? (
              <Loader2 data-icon="inline-start" className="animate-spin" />
            ) : null}
            {connecting ? "Connecting…" : "Connect"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
