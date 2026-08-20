"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Check, Loader2, RefreshCw, Sparkles, ThumbsDown, ThumbsUp, Wand2, X } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import {
  enrichCompany,
  enrichContact,
  submitEnrichmentFeedback,
  type EnrichmentView,
} from "@/app/actions/enrichment"
import type { EnrichmentSubjectType, FeedbackSignal } from "@/lib/enrichment/types"

const FIT_BADGE: Record<string, string> = {
  Strong: "bg-emerald-100 text-emerald-800 border-emerald-200",
  Good: "bg-sky-100 text-sky-800 border-sky-200",
  Fair: "bg-amber-100 text-amber-800 border-amber-200",
  Weak: "bg-muted text-muted-foreground",
}

function FeedbackButton({
  active,
  onClick,
  disabled,
  children,
}: {
  active: boolean
  onClick: () => void
  disabled?: boolean
  children: React.ReactNode
}) {
  return (
    <Button
      type="button"
      size="sm"
      variant={active ? "default" : "outline"}
      disabled={disabled}
      onClick={onClick}
      className="h-8"
    >
      {children}
    </Button>
  )
}

export function NulaIntelligenceCard({
  subjectType,
  subjectId,
  view,
}: {
  subjectType: EnrichmentSubjectType
  subjectId: string
  view: EnrichmentView | null
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [busy, setBusy] = useState(false)

  const enriched = view?.status === "enriched"
  const isPending = view?.status === "pending"

  async function handleEnrich() {
    setBusy(true)
    try {
      const res = subjectType === "contact" ? await enrichContact(subjectId) : await enrichCompany(subjectId)
      if (res.status === "enriched") toast.success("Enriched with Nula Intelligence")
      else toast.success("Enrichment started — results will appear shortly")
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not enrich")
    } finally {
      setBusy(false)
    }
  }

  function handleFeedback(signal: FeedbackSignal) {
    startTransition(async () => {
      try {
        await submitEnrichmentFeedback({ subjectType, subjectId, signal })
        toast.success("Thanks — feedback saved")
        router.refresh()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not save feedback")
      }
    })
  }

  const has = (s: FeedbackSignal) => Boolean(view?.feedback.includes(s))

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between gap-2 text-base">
          <span className="flex items-center gap-2">
            <Sparkles className="size-4 text-primary" />
            Nula Intelligence
          </span>
          {enriched ? (
            <Badge variant="outline" className={FIT_BADGE[view!.fitLabel] ?? ""}>
              Fit {view!.fitScore}/100 — {view!.fitLabel}
            </Badge>
          ) : null}
        </CardTitle>
      </CardHeader>
      <CardContent className="text-sm">
        {/* Empty / not-yet-enriched state */}
        {!view || (!enriched && !isPending) ? (
          <div className="flex flex-col items-start gap-3">
            <p className="text-muted-foreground">
              Let Nula research this {subjectType} — we&apos;ll fill in industry, company size,
              revenue, title, a fit score, and a recommended next step.
            </p>
            <Button onClick={handleEnrich} disabled={busy}>
              {busy ? <Loader2 className="size-4 animate-spin" data-icon="inline-start" /> : <Wand2 data-icon="inline-start" />}
              Enrich
            </Button>
          </div>
        ) : null}

        {/* Pending */}
        {isPending ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Enriching… results will appear here shortly.
            <Button variant="ghost" size="sm" onClick={() => router.refresh()}>
              Refresh
            </Button>
          </div>
        ) : null}

        {/* Enriched */}
        {enriched ? (
          <div className="flex flex-col gap-3">
            {view!.summary ? <p>{view!.summary}</p> : null}
            {view!.recommendation ? (
              <p className="font-medium text-primary">Next: {view!.recommendation}</p>
            ) : null}

            {view!.fields.length ? (
              <>
                <Separator />
                <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
                  {view!.fields.map((f) => (
                    <div key={f.label} className="min-w-0">
                      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{f.label}</dt>
                      <dd className="truncate font-medium">{f.value}</dd>
                    </div>
                  ))}
                </dl>
              </>
            ) : null}

            <Separator />
            <div className="flex flex-col gap-2">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Is this a good prospect?</p>
              <div className="flex flex-wrap gap-2">
                <FeedbackButton active={has("good_prospect")} disabled={pending} onClick={() => handleFeedback("good_prospect")}>
                  <ThumbsUp data-icon="inline-start" /> Good prospect
                </FeedbackButton>
                <FeedbackButton active={has("bad_prospect")} disabled={pending} onClick={() => handleFeedback("bad_prospect")}>
                  <ThumbsDown data-icon="inline-start" /> Bad prospect
                </FeedbackButton>
                <FeedbackButton active={has("contact_correct")} disabled={pending} onClick={() => handleFeedback("contact_correct")}>
                  <Check data-icon="inline-start" /> Info correct
                </FeedbackButton>
                <FeedbackButton active={has("contact_incorrect")} disabled={pending} onClick={() => handleFeedback("contact_incorrect")}>
                  <X data-icon="inline-start" /> Info wrong
                </FeedbackButton>
                <FeedbackButton active={has("became_opportunity")} disabled={pending} onClick={() => handleFeedback("became_opportunity")}>
                  Became opportunity
                </FeedbackButton>
                <FeedbackButton active={has("became_customer")} disabled={pending} onClick={() => handleFeedback("became_customer")}>
                  Became customer
                </FeedbackButton>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs text-muted-foreground">
              <span>
                {view!.enrichedAt ? `Enriched ${new Date(view!.enrichedAt).toLocaleDateString()}` : ""}
                {" · "}
                {view!.creditsRemaining} enrichment{view!.creditsRemaining === 1 ? "" : "s"} left this month
              </span>
              <Button variant="ghost" size="sm" onClick={handleEnrich} disabled={busy}>
                {busy ? <Loader2 className="size-4 animate-spin" data-icon="inline-start" /> : <RefreshCw data-icon="inline-start" />}
                Re-enrich
              </Button>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
