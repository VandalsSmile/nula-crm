"use client"

import { useState } from "react"
import useSWR from "swr"
import { CalendarClock, Check, Copy, ExternalLink } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { getBookingWebhookUrl } from "@/app/actions/lead-sources"
import { canManageSettings } from "@/lib/roles"
import { useSessionUser } from "@/lib/session-context"

export function BookingsWebhookSettings() {
  const me = useSessionUser()
  const isAdmin = canManageSettings(me.role)
  const { data, isLoading } = useSWR(isAdmin ? "booking-webhook" : null, () => getBookingWebhookUrl())
  const [copied, setCopied] = useState(false)

  if (!isAdmin) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarClock className="size-4 text-muted-foreground" />
            Appointment bookings
          </CardTitle>
          <CardDescription>Only admins can manage booking integrations.</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const url = data?.url ?? ""

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarClock className="size-4 text-muted-foreground" />
          Appointment bookings (Calendly, Cal.com, …)
        </CardTitle>
        <CardDescription>
          Point your scheduling tool&apos;s webhook here. New bookings appear on your Calendar and
          are linked to (or create) the matching contact automatically.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <>
            <Field>
              <FieldLabel>Booking webhook URL (POST)</FieldLabel>
              <div className="flex gap-2">
                <Input readOnly value={url} className="font-mono text-xs" />
                <Button
                  type="button"
                  variant="outline"
                  className="shrink-0"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(url)
                      setCopied(true)
                      toast.success("Webhook URL copied")
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

            <div className="flex flex-col gap-2 rounded-lg bg-muted/50 p-4 text-sm">
              <p className="font-medium">Connect a provider</p>
              <ul className="ml-4 flex list-disc flex-col gap-1 text-muted-foreground">
                <li>
                  <span className="font-medium text-foreground">Calendly:</span> Integrations &amp;
                  apps → Webhooks → add the URL above; subscribe to{" "}
                  <code className="text-foreground">invitee.created</code> and{" "}
                  <code className="text-foreground">invitee.canceled</code>.{" "}
                  <a
                    href="https://calendly.com/integrations/api_webhooks"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-primary hover:underline"
                  >
                    Open Calendly <ExternalLink className="size-3" />
                  </a>
                </li>
                <li>
                  <span className="font-medium text-foreground">Cal.com:</span> Settings → Developer
                  → Webhooks → add the URL; subscribe to{" "}
                  <code className="text-foreground">BOOKING_CREATED</code> /{" "}
                  <code className="text-foreground">BOOKING_CANCELLED</code>.
                </li>
                <li>
                  <span className="font-medium text-foreground">Anything else / Zapier:</span> POST
                  JSON with <code className="text-foreground">name</code>,{" "}
                  <code className="text-foreground">email</code>,{" "}
                  <code className="text-foreground">start_time</code>,{" "}
                  <code className="text-foreground">end_time</code>, and{" "}
                  <code className="text-foreground">title</code>.
                </li>
              </ul>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
