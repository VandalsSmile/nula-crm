"use client"

import { useState } from "react"
import useSWR from "swr"
import { Loader2, PenLine, Target } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { EmailContactDialog } from "@/components/email-contact-dialog"
import { getAddonState, type AddonState } from "@/app/actions/billing"
import { assessSubject, draftOutreachEmail, type SubjectType } from "@/app/actions/outreach"
import { useWriteGuard } from "@/lib/use-write-guard"
import { cn } from "@/lib/utils"
import type { Assessment, OutreachAudience } from "@/lib/outreach/types"

const LABEL_CLASS: Record<string, string> = {
  Strong: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  Good: "bg-primary/15 text-primary",
  Fair: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  Weak: "bg-muted text-muted-foreground",
}

/**
 * Outreach Advisor scorecard for a contact/company. Module-gated (renders nothing
 * when the B2B Intelligence add-on is off). Shows fit, matched signals, the
 * recommended angle, and (for contacts with an email) a "Draft outreach" button.
 */
export function OutreachScorecardCard({
  subjectType,
  subjectId,
  draftRecipient,
}: {
  subjectType: SubjectType
  subjectId: string
  /** When present, enables "Draft outreach" into the email composer. */
  draftRecipient?: { name: string; email: string }
}) {
  const guardWrite = useWriteGuard()
  const { data: addon } = useSWR<AddonState>("addon-state", () => getAddonState())
  const enabled = Boolean(addon?.module.enabled)

  const [audience, setAudience] = useState<OutreachAudience>("sales")
  const { data, isLoading } = useSWR<Assessment>(
    enabled ? ["assess", subjectType, subjectId, audience] : null,
    () => assessSubject(subjectType, subjectId, audience),
  )

  const [drafting, setDrafting] = useState(false)
  const [draft, setDraft] = useState<{ subject: string; body: string } | null>(null)
  const [emailOpen, setEmailOpen] = useState(false)

  if (!enabled) return null

  async function handleDraft() {
    if (!guardWrite()) return
    setDrafting(true)
    try {
      const d = await draftOutreachEmail({ subjectType, subjectId, audience })
      setDraft({ subject: d.subject, body: d.html })
      setEmailOpen(true)
      toast.success(`Drafted using "${d.approachName}"`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not draft")
    } finally {
      setDrafting(false)
    }
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Target className="size-4 text-muted-foreground" />
          Outreach Advisor
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 text-sm">
        {/* Audience toggle */}
        <div className="inline-flex w-fit items-center gap-0.5 rounded-lg border p-0.5 text-xs">
          {(["sales", "bd"] as const).map((a) => (
            <button
              key={a}
              onClick={() => setAudience(a)}
              className={cn(
                "rounded-md px-2.5 py-1 font-medium transition-colors",
                audience === a ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
              aria-pressed={audience === a}
            >
              {a === "sales" ? "Sales" : "BD"}
            </button>
          ))}
        </div>

        {isLoading || !data ? (
          <div className="flex items-center gap-2 py-2 text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Scoring this target…
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold",
                  LABEL_CLASS[data.label] ?? LABEL_CLASS.Weak,
                )}
              >
                {data.label} fit · {data.score}
              </span>
            </div>

            {data.recommendedApproachName ? (
              <div>
                <p className="text-xs font-medium text-muted-foreground">Recommended angle</p>
                <p className="font-medium">{data.recommendedApproachName}</p>
              </div>
            ) : null}

            {data.observe ? (
              <p className="rounded-md bg-muted/50 p-2 text-xs text-muted-foreground">
                I noticed <span className="text-foreground">{data.observe}</span>
                {data.impact ? (
                  <>
                    {" "}
                    — <span className="text-foreground">{data.impact}</span>
                  </>
                ) : null}
              </p>
            ) : null}

            {data.matched.length ? (
              <div className="flex flex-wrap gap-1.5">
                {data.matched.map((m) => (
                  <Badge key={m.signalId} variant="secondary" className="text-[11px]">
                    {m.label}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">{data.rationale}</p>
            )}

            {draftRecipient?.email ? (
              <Button onClick={handleDraft} disabled={drafting} className="w-full">
                {drafting ? <Loader2 className="animate-spin" /> : <PenLine />}
                Draft outreach
              </Button>
            ) : null}
          </>
        )}
      </CardContent>

      {draft && draftRecipient?.email ? (
        <EmailContactDialog
          key={draft.subject + draft.body.length}
          open={emailOpen}
          onOpenChange={setEmailOpen}
          contactId={subjectId}
          contactName={draftRecipient.name}
          contactEmail={draftRecipient.email}
          initialSubject={draft.subject}
          initialBody={draft.body}
        />
      ) : null}
    </Card>
  )
}
