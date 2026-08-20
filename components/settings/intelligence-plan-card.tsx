"use client"

import { useCallback, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import useSWR from "swr"
import { BrainCircuit, Check, Loader2, XCircle } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  cancelAddon,
  createAddonCheckout,
  enableAddonNow,
  getAddonState,
  type AddonState,
} from "@/app/actions/billing"
import { B2B_INTELLIGENCE_FEATURES } from "@/lib/billing/plans"

function formatDate(iso: string | null): string {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })
}

export function IntelligencePlanCard() {
  const searchParams = useSearchParams()
  const { data, isLoading, mutate } = useSWR<AddonState>("addon-state", () => getAddonState())
  const [busy, setBusy] = useState<string | null>(null)

  const refresh = useCallback(() => mutate(), [mutate])

  useEffect(() => {
    if (searchParams.get("addon") === "b2b_intelligence" && searchParams.get("checkout") === "success") {
      toast.success("B2B Intelligence is being activated — thank you!")
      refresh()
    }
  }, [searchParams, refresh])

  if (isLoading || !data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>B2B Intelligence add-on</CardTitle>
          <CardDescription>Loading…</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const { module, companyModel, configured, canManage, plans } = data
  const isB2c = companyModel === "b2c"
  const isComped = module.status === "comped"
  const monthly = plans.find((p) => p.interval === "month")

  async function handleSubscribe() {
    if (!monthly && configured) {
      toast.error("This add-on isn't available yet.")
      return
    }
    setBusy("subscribe")
    try {
      if (configured && monthly) {
        const res = await createAddonCheckout(monthly.id)
        if (res.url) {
          window.location.assign(res.url)
          return
        }
        toast.error(res.error || "Could not start checkout")
      } else {
        // Dev/no-Square fallback.
        await enableAddonNow()
        toast.success("B2B Intelligence enabled")
        refresh()
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not enable add-on")
    } finally {
      setBusy(null)
    }
  }

  async function handleCancel() {
    setBusy("cancel")
    try {
      await cancelAddon()
      toast.success("B2B Intelligence will end at the close of the billing period.")
      refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not cancel add-on")
    } finally {
      setBusy(null)
    }
  }

  return (
    <Card className={module.enabled ? "" : "border-nula-violet/20 bg-nula-violet/[0.03]"}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BrainCircuit className="size-5 text-nula-violet" />
          B2B Intelligence
          {isComped ? (
            <Badge>Complimentary</Badge>
          ) : module.enabled ? (
            <Badge>Active</Badge>
          ) : (
            <Badge variant="secondary">Add-on · $49/mo</Badge>
          )}
        </CardTitle>
        <CardDescription>
          {module.enabled
            ? "One-click enrichment, fit scores, and AI recommendations on your contacts and companies."
            : isB2c
              ? "Optional add-on. Built for businesses that sell to other businesses — enrichment fills in firmographics like industry, size, and revenue."
              : "Turn thin leads into qualified prospects — auto-fill firmographics, score fit, and get an AI recommendation with one click."}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {module.enabled ? (
          <div className="flex flex-col gap-3 rounded-lg border border-primary/20 bg-primary/5 p-4">
            <div className="flex items-center gap-2 text-sm">
              <Check className="size-4 text-primary" />
              <span>Active — enrich contacts and companies from their detail pages.</span>
            </div>
            <p className="text-sm text-muted-foreground">
              {module.creditsUsed} of {module.creditLimit} monthly enrichments used
              {module.renewsAt ? ` · renews ${formatDate(module.renewsAt)}` : ""}
            </p>
            {isComped ? (
              <p className="text-sm text-muted-foreground">
                Your workspace has complimentary access — no charge.
              </p>
            ) : canManage ? (
              <Button variant="outline" className="w-fit" onClick={handleCancel} disabled={busy === "cancel"}>
                {busy === "cancel" ? <Loader2 className="size-4 animate-spin" /> : <XCircle className="size-4" />}
                Cancel add-on
              </Button>
            ) : (
              <p className="text-sm text-muted-foreground">Only the account owner can manage billing.</p>
            )}
          </div>
        ) : (
          <>
            <ul className="flex flex-col gap-2">
              {B2B_INTELLIGENCE_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                  <Check className="mt-0.5 size-4 shrink-0 text-nula-violet" />
                  {f}
                </li>
              ))}
            </ul>
            <div className="flex items-end gap-2">
              <span className="text-3xl font-semibold">$49</span>
              <span className="mb-1 text-sm text-muted-foreground">/ month, on top of your plan</span>
            </div>
            {canManage ? (
              <Button className="w-fit" onClick={handleSubscribe} disabled={busy === "subscribe"}>
                {busy === "subscribe" ? <Loader2 className="size-4 animate-spin" data-icon="inline-start" /> : null}
                {configured ? "Add B2B Intelligence" : "Enable B2B Intelligence"}
              </Button>
            ) : (
              <p className="text-sm text-muted-foreground">Ask the account owner to add this module.</p>
            )}
            {!configured && canManage ? (
              <p className="text-xs text-muted-foreground">
                Card checkout activates once Square is connected; this enables the module in the meantime.
              </p>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  )
}
