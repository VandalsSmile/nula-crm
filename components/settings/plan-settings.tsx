"use client"

import { useState } from "react"
import useSWR from "swr"
import { Check, Loader2, Sparkles } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { activatePlan, getTrialStatus } from "@/app/actions/workspace"
import { TRIAL_DAYS, type TrialStatus } from "@/lib/trial"
import { isBillingManager } from "@/lib/roles"
import { useSessionUser } from "@/lib/session-context"

const FEATURES = [
  "Unlimited contacts, tags, and groups",
  "AI command bar and lead scoring",
  "Campaigns, automations, and reports",
  "All lead sources: web forms, email, calls, webhooks",
]

function formatDate(iso: string | null): string {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

export function PlanSettings() {
  const me = useSessionUser()
  const canManageBilling = isBillingManager(me.role)
  const { data, isLoading, mutate } = useSWR<TrialStatus>("trial-status", () => getTrialStatus())
  const [saving, setSaving] = useState(false)

  async function handleUpgrade() {
    setSaving(true)
    try {
      await activatePlan()
      toast.success("You're on the Nula plan — thanks!")
      mutate()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not upgrade")
    } finally {
      setSaving(false)
    }
  }

  const isActive = data?.plan === "active"
  const isExpired = Boolean(data?.isExpired)

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Plan &amp; billing
            {isActive ? (
              <Badge>Active</Badge>
            ) : isExpired ? (
              <Badge variant="destructive">Trial ended</Badge>
            ) : (
              <Badge variant="secondary">Free trial</Badge>
            )}
          </CardTitle>
          <CardDescription>
            {isLoading
              ? "Loading your plan…"
              : isActive
                ? "Your workspace is on the Nula plan. Thanks for your support!"
                : isExpired
                  ? "Your free trial has ended. Upgrade to keep using Nula."
                  : `You're on a ${TRIAL_DAYS}-day free trial.`}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {!isActive && !isLoading ? (
            <div className="rounded-lg border bg-muted/30 p-4">
              {isExpired ? (
                <p className="text-sm text-muted-foreground">
                  Your trial ended on <span className="font-medium text-foreground">{formatDate(data?.trialEndsAt ?? null)}</span>.
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  <span className="text-2xl font-semibold text-foreground">{data?.daysLeft ?? 0}</span>{" "}
                  day{data?.daysLeft === 1 ? "" : "s"} left · ends{" "}
                  <span className="font-medium text-foreground">{formatDate(data?.trialEndsAt ?? null)}</span>
                </p>
              )}
            </div>
          ) : null}

          {isActive ? (
            <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 p-4 text-sm">
              <Check className="size-4 text-primary" />
              <span>You have full access to Nula.</span>
            </div>
          ) : (
            <div className="rounded-lg border p-4">
              <div className="flex items-center gap-2">
                <Sparkles className="size-4 text-nula-violet" />
                <span className="font-medium">Nula plan</span>
              </div>
              <ul className="mt-3 flex flex-col gap-1.5">
                {FEATURES.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Check className="size-4 shrink-0 text-primary" />
                    {f}
                  </li>
                ))}
              </ul>
              {canManageBilling ? (
                <div className="mt-4 flex flex-col gap-1.5">
                  <Button onClick={handleUpgrade} disabled={saving} className="w-fit">
                    {saving ? <Loader2 className="size-4 animate-spin" /> : null}
                    Upgrade now
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Payment checkout is coming soon — this activates your workspace in the meantime.
                  </p>
                </div>
              ) : (
                <p className="mt-4 text-sm text-muted-foreground">
                  Ask the account owner to upgrade.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
