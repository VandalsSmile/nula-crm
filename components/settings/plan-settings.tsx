"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import useSWR from "swr"
import { Check, ExternalLink, Loader2, Sparkles } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { activatePlan, getTrialStatus } from "@/app/actions/workspace"
import {
  createBillingPortalSession,
  createCheckoutSession,
  getBillingState,
  type BillingState,
} from "@/app/actions/billing"
import { PLAN_FEATURES } from "@/lib/billing/plans"
import { TRIAL_DAYS, type TrialStatus } from "@/lib/trial"
import { isBillingManager } from "@/lib/roles"
import { useSessionUser } from "@/lib/session-context"

function formatDate(iso: string | null): string {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })
}

export function PlanSettings() {
  const me = useSessionUser()
  const canManageBilling = isBillingManager(me.role)
  const searchParams = useSearchParams()

  const { data: trial, isLoading: trialLoading, mutate: mutateTrial } = useSWR<TrialStatus>(
    "trial-status",
    () => getTrialStatus(),
  )
  const { data: billing, isLoading: billingLoading, mutate: mutateBilling } = useSWR<BillingState>(
    "billing-state",
    () => getBillingState(),
  )
  const [busy, setBusy] = useState<string | null>(null)

  // Surface the result of returning from Stripe Checkout.
  useEffect(() => {
    const status = searchParams.get("checkout")
    if (status === "success") {
      toast.success("Thanks! Your subscription is being activated.")
      mutateBilling()
      mutateTrial()
    } else if (status === "cancel") {
      toast.info("Checkout canceled — no charge was made.")
    }
  }, [searchParams, mutateBilling, mutateTrial])

  async function handleSubscribe(planId: string) {
    setBusy(planId)
    try {
      const { url } = await createCheckoutSession(planId)
      window.location.assign(url)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not start checkout")
      setBusy(null)
    }
  }

  async function handleManage() {
    setBusy("manage")
    try {
      const { url } = await createBillingPortalSession()
      window.location.assign(url)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not open billing")
      setBusy(null)
    }
  }

  async function handleActivate() {
    setBusy("activate")
    try {
      await activatePlan()
      toast.success("You're on the Nula plan — thanks!")
      mutateBilling()
      mutateTrial()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not upgrade")
    } finally {
      setBusy(null)
    }
  }

  const loading = trialLoading || billingLoading
  const subscribed = Boolean(billing?.hasActiveSubscription)
  const isExpired = Boolean(trial?.isExpired) && !subscribed

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Plan &amp; billing
            {subscribed ? (
              <Badge>Active</Badge>
            ) : isExpired ? (
              <Badge variant="destructive">Trial ended</Badge>
            ) : (
              <Badge variant="secondary">Free trial</Badge>
            )}
          </CardTitle>
          <CardDescription>
            {loading
              ? "Loading your plan…"
              : subscribed
                ? `You're subscribed to ${billing?.currentPlanName ?? "Nula"}${
                    billing?.currentInterval ? ` (${billing.currentInterval}ly)` : ""
                  }.`
                : isExpired
                  ? "Your free trial has ended. Subscribe to keep using Nula."
                  : `You're on a ${TRIAL_DAYS}-day free trial.`}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {/* Current subscription */}
          {subscribed ? (
            <div className="flex flex-col gap-3 rounded-lg border border-primary/20 bg-primary/5 p-4">
              <div className="flex items-center gap-2 text-sm">
                <Check className="size-4 text-primary" />
                <span>
                  {billing?.subscriptionStatus === "past_due"
                    ? "Your payment is past due — update your card to avoid interruption."
                    : "You have full access to Nula."}
                </span>
              </div>
              {billing?.currentPeriodEnd ? (
                <p className="text-sm text-muted-foreground">
                  Renews on{" "}
                  <span className="font-medium text-foreground">
                    {formatDate(billing.currentPeriodEnd)}
                  </span>
                </p>
              ) : null}
              {canManageBilling ? (
                <Button variant="outline" className="w-fit" onClick={handleManage} disabled={busy === "manage"}>
                  {busy === "manage" ? <Loader2 className="size-4 animate-spin" /> : <ExternalLink className="size-4" />}
                  Manage billing
                </Button>
              ) : (
                <p className="text-sm text-muted-foreground">Only the account owner can manage billing.</p>
              )}
            </div>
          ) : (
            <>
              {/* Trial status line */}
              {!loading ? (
                <div className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
                  {isExpired ? (
                    <>Your trial ended on <span className="font-medium text-foreground">{formatDate(trial?.trialEndsAt ?? null)}</span>.</>
                  ) : (
                    <>
                      <span className="text-2xl font-semibold text-foreground">{trial?.daysLeft ?? 0}</span>{" "}
                      day{trial?.daysLeft === 1 ? "" : "s"} left · ends{" "}
                      <span className="font-medium text-foreground">{formatDate(trial?.trialEndsAt ?? null)}</span>
                    </>
                  )}
                </div>
              ) : null}

              {/* Plan options (Stripe) or the pre-Stripe fallback */}
              {billing?.configured && (billing?.plans.length ?? 0) > 0 ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  {billing!.plans.map((plan) => (
                    <div key={plan.id} className="flex flex-col gap-3 rounded-lg border p-4">
                      <div className="flex items-center gap-2">
                        <Sparkles className="size-4 text-nula-violet" />
                        <span className="font-medium">{plan.name}</span>
                      </div>
                      <p className="text-2xl font-semibold">{plan.priceLabel}</p>
                      <p className="text-xs text-muted-foreground">{plan.blurb}</p>
                      {canManageBilling ? (
                        <Button onClick={() => handleSubscribe(plan.id)} disabled={busy === plan.id} className="mt-1 w-full">
                          {busy === plan.id ? <Loader2 className="size-4 animate-spin" /> : null}
                          Subscribe
                        </Button>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-lg border p-4">
                  <div className="flex items-center gap-2">
                    <Sparkles className="size-4 text-nula-violet" />
                    <span className="font-medium">Nula plan</span>
                  </div>
                  <ul className="mt-3 flex flex-col gap-1.5">
                    {PLAN_FEATURES.map((f) => (
                      <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Check className="size-4 shrink-0 text-primary" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  {canManageBilling ? (
                    <div className="mt-4 flex flex-col gap-1.5">
                      <Button onClick={handleActivate} disabled={busy === "activate"} className="w-fit">
                        {busy === "activate" ? <Loader2 className="size-4 animate-spin" /> : null}
                        Upgrade now
                      </Button>
                      <p className="text-xs text-muted-foreground">
                        Card checkout activates once Stripe is connected; this activates your workspace in the meantime.
                      </p>
                    </div>
                  ) : (
                    <p className="mt-4 text-sm text-muted-foreground">Ask the account owner to upgrade.</p>
                  )}
                </div>
              )}

              {canManageBilling ? null : (
                <p className="text-sm text-muted-foreground">Only the account owner can manage billing.</p>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
