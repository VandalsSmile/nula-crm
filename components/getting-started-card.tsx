"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Check, Rocket, X } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { APP_ROUTES } from "@/lib/routes"
import { cn } from "@/lib/utils"

const DISMISS_KEY = "nula-getting-started-dismissed"

type Step = { label: string; href: string; done: boolean }

export function GettingStartedCard({ hasContacts }: { hasContacts: boolean }) {
  const [dismissed, setDismissed] = useState(true)

  // Read dismissal after mount to avoid a hydration mismatch. Deferred off the
  // synchronous effect path (avoids the cascading-render lint rule).
  useEffect(() => {
    queueMicrotask(() => setDismissed(localStorage.getItem(DISMISS_KEY) === "1"))
  }, [])

  if (dismissed) return null

  const steps: Step[] = [
    { label: "Add your first contact", href: APP_ROUTES.contacts, done: hasContacts },
    { label: "Schedule a follow-up task", href: APP_ROUTES.tasks, done: false },
    { label: "Send your first email campaign", href: APP_ROUTES.campaigns, done: false },
    { label: "Connect where your leads come from", href: `${APP_ROUTES.settings}?tab=leads`, done: false },
  ]

  return (
    <Card className="border-nula-violet/20 bg-nula-violet/5">
      <CardHeader className="flex-row items-center justify-between gap-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Rocket className="size-4 text-nula-violet" />
          Getting started
        </CardTitle>
        <button
          type="button"
          aria-label="Dismiss"
          onClick={() => {
            localStorage.setItem(DISMISS_KEY, "1")
            setDismissed(true)
          }}
          className="rounded p-0.5 text-muted-foreground transition-colors hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {steps.map((step) => (
          <Link
            key={step.label}
            href={step.href}
            className="flex items-center gap-3 rounded-lg border bg-background px-3 py-2 text-sm hover:bg-muted/50"
          >
            <span
              className={cn(
                "flex size-5 shrink-0 items-center justify-center rounded-full border",
                step.done
                  ? "border-emerald-500 bg-emerald-500 text-white"
                  : "border-muted-foreground/30 text-transparent",
              )}
            >
              <Check className="size-3" />
            </span>
            <span className={cn(step.done && "text-muted-foreground line-through")}>{step.label}</span>
          </Link>
        ))}
      </CardContent>
    </Card>
  )
}
