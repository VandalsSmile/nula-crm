"use client"

import { useCallback, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import useSWR from "swr"
import { initializePaddle, type Paddle } from "@paddle/paddle-js"
import { Check, ExternalLink, Loader2, Sparkles } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { activatePlan, getTrialStatus } from "@/app/actions/workspace"
import {
  createBillingPortalSession,
  getBillingState,
  type BillingState,
  type PlanOption,
} from "@/app/actions/billing"
import { PLAN_FEATURES } from "@/lib/billing/plans"
import { TRIAL_DAYS, type TrialStatus } from "@/lib/trial"
import { isBillingManager } from "@/lib/roles"
import { useSessionUser } from "@/lib/session-context"

const PADDLE_ENV =
  process.env.NEXT_PUBLIC_PADDLE_ENV === "production" ? "production" : "sandbox"
const PADDLE_CLIENT_TOKEN = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN

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
  const [paddle, setPaddle] = useState<Paddle | undefined>()
  const [busy, setBusy] = useState<string | null>(null)

  const refresh = useCallback(() => {
    mutateBilling()
    mutateTrial()
  }, [mutateBilling, mutateTrial])

  // Load Paddle.js for the client-side checkout overlay.
  useEffect(() => {
    if (!PADDLE_CLIENT_TOKEN || paddle) return
    let cancelled = false
    initializePaddle({
      environment: PADDLE_ENV,
      token: PADDLE_CLIENT_TOKEN,
      eventCallback: (event) => {
        if (event?.name === "checkout.completed") {
          toast.success("Thanks! Activating your subscription…")
          // The webhook finalizes it; refetch shortly after.
          setTimeout(refresh, 2500)
        }
      },
    })
      .then((instance) => {
        if (!cancelled) setPaddle(instance)
      })
      .catch(() => {
        /* checkout stays unavailable; UI handles it */
      })
    return () => {
      cancelled = true
    }
  }, [paddle, refresh])

  // Surface returning from a hosted checkout success URL.
  useEffect(() => {
    if (searchParams.get("checkout") === "success") {
      toast.success("Thanks! Your subscription is being activated.")
      refresh()
    }
  }, [searchParams, refresh])

  function handleSubscribe(plan: PlanOption) {
    if (!paddle) {
      toast.error("Checkout isn't ready yet — please try again in a moment.")
      return
    }
    if (!billing) return
    paddle.Checkout.open({
      items: [{ priceId: plan.priceId, quantity: 1 }],
      ...(billing.customerEmail ? { customer: { email: billing.customerEmail } } : {}),
      customData: { workspaceId: billing.workspaceId },
      settings: {
        displayMode: "overlay",
        successUrl: `${window.location.origin}/app/settings?tab=plan&checkout=success`,
      },
    })
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
      refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not upgrade")
    } finally {
      setBusy(null)
    }
  }

  const loading = trialLoading || billingLoading
  const subscribed = Boolean(billing?.hasActiveSubscription)
  const isExpired = Boolean(trial?.isExpired) && !subscribed
  const canCheckout = Boolean(billing?.configured) && (billing?.plans.length ?? 0) > 0

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
                <Button
                  variant="outline"
                  className="w-fit"
                  onClick={handleManage}
                  disabled={busy === "manage"}
                >
                  {busy === "manage" ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <ExternalLink className="size-4" />
                  )}
                  Manage billing
                </Button>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Only the account owner can manage billing.
                </p>
              )}
            </div>
          ) : (
            <>
              {!loading ? (
                <div className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
                  {isExpired ? (
                    <>
                      Your trial ended on{" "}
                      <span className="font-medium text-foreground">
                        {formatDate(trial?.trialEndsAt ?? null)}
                      </span>
                      .
                    </>
                  ) : (
                    <>
                      <span className="text-2xl font-semibold text-foreground">
                        {trial?.daysLeft ?? 0}
                      </span>{" "}
                      day{trial?.daysLeft === 1 ? "" : "s"} left · ends{" "}
                      <span className="font-medium text-foreground">
                        {formatDate(trial?.trialEndsAt ?? null)}
                      </span>
                    </>
                  )}
                </div>
              ) : null}

              {canCheckout ? (
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
                        <Button
                          onClick={() => handleSubscribe(plan)}
                          className="mt-1 w-full"
                        >
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
                        Card checkout activates once Paddle is connected; this activates your
                        workspace in the meantime.
                      </p>
                    </div>
                  ) : (
                    <p className="mt-4 text-sm text-muted-foreground">
                      Ask the account owner to upgrade.
                    </p>
                  )}
                </div>
              )}

              {!canManageBilling ? (
                <p className="text-sm text-muted-foreground">
                  Only the account owner can manage billing.
                </p>
              ) : null}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
