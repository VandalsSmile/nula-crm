"use client"

import Link from "next/link"
import { useState } from "react"
import { Check, Sparkles } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { APP_ROUTES } from "@/lib/routes"

const INCLUDED = [
  "Unlimited contacts, companies, and pipelines",
  "Unlimited tags, groups, and custom segments",
  "Deals, campaigns, and automations",
  "Unified inbox — email, SMS, and web leads",
  "All lead sources: web forms, email, phone, webhooks",
  "Reports and dashboards",
  "Team access with roles (Owner, Admin, Member)",
  "Free support, always",
  "All features & free upgrades",
]

const AI_INCLUDED = [
  "AI command bar — describe it, Nula does it",
  "Automatic lead scoring & summaries",
  "Drafted follow-ups and campaigns",
  "Smart segmentation and tagging",
]

const FAQ = [
  {
    q: "What's included in the free trial?",
    a: "Everything — including all the AI. Use Nula free for 14 days, no credit card required. Cancel anytime.",
  },
  {
    q: "Is it really one price?",
    a: "Yes. One flat price per user, per month. No tiers, no features locked behind upgrades, no contracts. AI is included.",
  },
  {
    q: "What about AI usage and costs?",
    a: "AI is included in your subscription with a generous monthly allowance pooled across your whole team. In the rare case you run past it, Nula quietly falls back to its non-AI mode — you'll never get a surprise bill.",
  },
  {
    q: "Can I add teammates?",
    a: "Absolutely. Invite as many teammates as you like and give them Owner, Admin, or Member access. You're billed per active user.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes. There are no contracts — cancel with one click and your data is always yours to export.",
  },
]

type Billing = "monthly" | "annual"

export function MarketingPricing() {
  const [billing, setBilling] = useState<Billing>("monthly")
  const annual = billing === "annual"
  const perMonth = annual ? "$24" : "$29"

  return (
    <div>
      {/* Hero */}
      <section className="px-4 pt-16 pb-10 md:px-6 md:pt-24">
        <div className="mx-auto max-w-2xl text-center">
          <p className="inline-flex items-center gap-2 rounded-full bg-nula-violet/10 px-3.5 py-1.5 text-xs font-medium tracking-wide text-nula-violet">
            <Sparkles className="size-3.5" />
            No calculator needed. AI included.
          </p>
          <h1 className="mt-5 text-4xl font-semibold tracking-tight text-nula-ink md:text-5xl">
            One simple price for everyone.
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-nula-ink/65">
            No tiers. No contracts. No features — or AI — locked behind upgrades. Just one price that
            includes everything.
          </p>

          {/* Billing toggle */}
          <div className="mt-8 inline-flex items-center gap-1 rounded-full border border-border/60 bg-white p-1">
            <button
              type="button"
              onClick={() => setBilling("monthly")}
              className={cn(
                "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
                !annual ? "bg-nula-violet text-white" : "text-nula-ink/60 hover:text-nula-ink",
              )}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setBilling("annual")}
              className={cn(
                "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
                annual ? "bg-nula-violet text-white" : "text-nula-ink/60 hover:text-nula-ink",
              )}
            >
              Annual <span className={cn("text-xs", annual ? "text-white/80" : "text-nula-violet")}>save ~17%</span>
            </button>
          </div>
        </div>
      </section>

      {/* Price card */}
      <section className="px-4 pb-16 md:px-6">
        <div className="mx-auto max-w-lg">
          <div className="overflow-hidden rounded-3xl border border-nula-violet/15 bg-white shadow-xl shadow-nula-violet/10">
            <div className="border-b border-border/50 bg-gradient-to-b from-nula-violet/5 to-transparent px-8 py-10 text-center">
              <p className="text-sm font-semibold uppercase tracking-wide text-nula-violet">Nula</p>
              <p className="mt-1 text-sm text-nula-ink/55">Everything, plus AI. Included.</p>
              <div className="mt-6 flex items-end justify-center gap-1">
                <span className="text-6xl font-semibold tracking-tight text-nula-ink">{perMonth}</span>
                <span className="mb-2 text-nula-ink/55">/ user / month</span>
              </div>
              <p className="mt-2 text-sm text-nula-ink/55">
                {annual ? "Billed annually ($290/user/year) + applicable tax" : "Billed monthly + applicable tax"}
              </p>
              <Button
                render={<Link href={APP_ROUTES.signup} />}
                className="mt-7 w-full rounded-full px-6 shadow-md shadow-nula-violet/20"
                size="lg"
              >
                Start your 14-day free trial
              </Button>
              <p className="mt-3 text-xs text-nula-ink/50">No credit card required · Cancel anytime</p>
            </div>

            <div className="px-8 py-8">
              <div className="flex items-center gap-2">
                <Sparkles className="size-4 text-nula-violet" />
                <p className="text-sm font-semibold text-nula-ink">AI included</p>
              </div>
              <ul className="mt-3 flex flex-col gap-2.5">
                {AI_INCLUDED.map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-nula-ink/75">
                    <Check className="mt-0.5 size-4 shrink-0 text-nula-violet" />
                    {item}
                  </li>
                ))}
              </ul>

              <div className="my-6 h-px bg-border/60" />

              <p className="text-sm font-semibold text-nula-ink">Everything included</p>
              <ul className="mt-3 flex flex-col gap-2.5">
                {INCLUDED.map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-nula-ink/75">
                    <Check className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <p className="mx-auto mt-6 max-w-md text-center text-xs leading-relaxed text-nula-ink/50">
            AI is included with a generous monthly allowance pooled across your team. If you ever
            exceed it, Nula falls back to its non-AI mode — never a surprise bill.
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-t border-border/60 bg-white px-4 py-16 md:px-6">
        <div className="mx-auto max-w-2xl">
          <h2 className="text-center text-2xl font-semibold tracking-tight text-nula-ink md:text-3xl">
            Common questions, straight answers.
          </h2>
          <div className="mt-8 flex flex-col divide-y divide-border/60">
            {FAQ.map((item) => (
              <div key={item.q} className="py-5">
                <h3 className="text-base font-medium text-nula-ink">{item.q}</h3>
                <p className="mt-2 text-sm leading-relaxed text-nula-ink/65">{item.a}</p>
              </div>
            ))}
          </div>

          <div className="mt-10 rounded-2xl border border-nula-violet/15 bg-nula-violet/5 px-6 py-8 text-center">
            <h3 className="text-xl font-semibold tracking-tight text-nula-ink">
              Ready to let AI do the busywork?
            </h3>
            <p className="mt-2 text-sm text-nula-ink/65">
              Start free for 14 days. No credit card, no contracts.
            </p>
            <Button
              render={<Link href={APP_ROUTES.signup} />}
              className="mt-5 rounded-full px-6 shadow-md shadow-nula-violet/20"
              size="lg"
            >
              Get started free
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}
