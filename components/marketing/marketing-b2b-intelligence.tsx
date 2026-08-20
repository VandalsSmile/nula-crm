import Link from "next/link"
import {
  ArrowRight,
  BrainCircuit,
  Check,
  Gauge,
  Sparkles,
  Tags,
  Target,
  Wand2,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { APP_ROUTES } from "@/lib/routes"

const STEPS = [
  {
    icon: Wand2,
    title: "Enrich",
    body: "Click one button on any lead. Nula researches the person and their company for you — no spreadsheets, no data tools, no homework.",
  },
  {
    icon: BrainCircuit,
    title: "Understand",
    body: "We turn raw data into a plain-English summary and a Fit Score so you instantly know: is this the kind of customer worth my time?",
  },
  {
    icon: Target,
    title: "Recommend",
    body: "Nula tells you the smartest next step — call now, nurture, or skip — so your team spends time on the leads most likely to buy.",
  },
]

const FIELDS = [
  "Industry & sub-industry",
  "Company size & employee count",
  "Estimated revenue",
  "Job title & seniority",
  "Decision-maker status",
  "Location & market",
  "Website & LinkedIn",
  "Tech stack & growth signals",
]

const BENEFITS = [
  {
    icon: Gauge,
    title: "Know who's worth your time",
    body: "A 0–100 Fit Score on every prospect means your small team chases the right accounts instead of every account.",
  },
  {
    icon: Tags,
    title: "Segments that build themselves",
    body: 'Enriched details become smart tags, so you can just ask: "Show me all healthcare decision makers" or "Find my best local prospects."',
  },
  {
    icon: Sparkles,
    title: "Enterprise data, small-business simple",
    body: "The same firmographic intelligence big sales teams pay thousands for — delivered as one friendly button inside your CRM.",
  },
]

const SEGMENTS = [
  "Show me all healthcare decision makers",
  "Create a segment of companies with more than 20 employees",
  "Find our best Alabama prospects",
  "Which leads look like our best customers?",
]

const FAQ = [
  {
    q: "Who is this for?",
    a: "Small businesses that sell to other businesses (B2B). If your customers are companies, this turns thin leads into qualified prospects automatically.",
  },
  {
    q: "Do I need to understand “data enrichment”?",
    a: "No. You click Enrich, and your contact gets smarter — a summary, a fit score, and a recommended next step. That's it.",
  },
  {
    q: "How much does it cost?",
    a: "$49/month on top of your Nula plan, including 250 enrichments every month. Turn it on or off anytime.",
  },
  {
    q: "What if I'm a B2C business?",
    a: "This add-on is built for B2B firmographics, so it's optional and off by default. Your Nula CRM works great without it.",
  },
]

export function MarketingB2BIntelligence() {
  return (
    <div>
      {/* Hero */}
      <section className="px-4 pt-16 pb-12 md:px-6 md:pt-24">
        <div className="mx-auto max-w-3xl text-center">
          <p className="inline-flex items-center gap-2 rounded-full bg-nula-violet/10 px-3.5 py-1.5 text-xs font-medium tracking-wide text-nula-violet">
            <BrainCircuit className="size-3.5" />
            New add-on · Built for B2B
          </p>
          <h1 className="mt-5 text-4xl font-semibold tracking-tight text-nula-ink md:text-5xl">
            Turn a name and an email into a qualified prospect.
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg leading-relaxed text-nula-ink/65">
            Nula B2B Intelligence researches every lead the moment you get it — filling in who they
            are, how big their company is, and whether they&apos;re worth your time. One click.
            No data tools. No busywork.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button
              render={<Link href={APP_ROUTES.signup} />}
              size="lg"
              className="rounded-full px-6 shadow-md shadow-nula-violet/20"
            >
              Start free
              <ArrowRight data-icon="inline-end" />
            </Button>
            <Button
              render={<Link href={APP_ROUTES.pricing} />}
              size="lg"
              variant="outline"
              className="rounded-full px-6"
            >
              See pricing
            </Button>
          </div>
          <p className="mt-3 text-xs text-nula-ink/50">$49/month add-on · 250 enrichments included · Cancel anytime</p>
        </div>
      </section>

      {/* Before / after */}
      <section className="px-4 pb-16 md:px-6">
        <div className="mx-auto grid max-w-4xl gap-4 md:grid-cols-2">
          <div className="rounded-3xl border border-border/60 bg-white p-7">
            <p className="text-xs font-semibold uppercase tracking-wide text-nula-ink/40">Before</p>
            <p className="mt-3 text-lg font-medium text-nula-ink">Bob Smith</p>
            <p className="text-sm text-nula-ink/55">bob@huntsvilleortho.com</p>
            <p className="mt-4 text-sm text-nula-ink/50">
              You know almost nothing. Is this even worth a follow-up? Who knows.
            </p>
          </div>
          <div className="rounded-3xl border border-nula-violet/20 bg-gradient-to-b from-nula-violet/[0.06] to-white p-7 shadow-lg shadow-nula-violet/10">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-nula-violet">After Nula</p>
              <span className="rounded-full border border-emerald-200 bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800">
                Fit 88 — Strong
              </span>
            </div>
            <p className="mt-3 text-lg font-medium text-nula-ink">Bob Smith — Marketing Director</p>
            <p className="text-sm text-nula-ink/60">Huntsville Orthopedics · Healthcare → Orthopedics</p>
            <p className="mt-1 text-sm text-nula-ink/60">
              Huntsville, AL · 43 employees · $5M–$10M est. · multi-location
            </p>
            <p className="mt-4 text-sm text-nula-ink/75">
              <span className="font-medium text-nula-violet">Next:</span> High-priority prospect.
              Review their site and paid-search before outreach.
            </p>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-border/60 bg-white px-4 py-16 md:px-6">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center text-2xl font-semibold tracking-tight text-nula-ink md:text-3xl">
            Enrich → Understand → Recommend
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-nula-ink/60">
            Three steps, one click. Nula does the research so you can do the selling.
          </p>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {STEPS.map((s) => (
              <div key={s.title} className="rounded-2xl border border-border/60 bg-nula-paper p-6">
                <div className="flex size-11 items-center justify-center rounded-xl bg-nula-violet/10 text-nula-violet">
                  <s.icon className="size-5" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-nula-ink">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-nula-ink/65">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="px-4 py-16 md:px-6">
        <div className="mx-auto max-w-5xl">
          <div className="grid gap-5 md:grid-cols-3">
            {BENEFITS.map((b) => (
              <div key={b.title} className="rounded-2xl border border-border/60 bg-white p-6">
                <div className="flex size-11 items-center justify-center rounded-xl bg-nula-violet/10 text-nula-violet">
                  <b.icon className="size-5" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-nula-ink">{b.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-nula-ink/65">{b.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What you get */}
      <section className="border-t border-border/60 bg-white px-4 py-16 md:px-6">
        <div className="mx-auto grid max-w-5xl gap-10 md:grid-cols-2 md:items-center">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-nula-ink md:text-3xl">
              Every lead, fully filled in.
            </h2>
            <p className="mt-3 text-nula-ink/65">
              Stop copy-pasting from LinkedIn and guessing company size. Nula fills the gaps
              automatically and keeps your CRM clean and useful.
            </p>
            <ul className="mt-6 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {FIELDS.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-sm text-nula-ink/75">
                  <Check className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                  {f}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-3xl border border-nula-violet/15 bg-nula-paper p-7">
            <p className="text-sm font-semibold text-nula-ink">Then just ask Nula:</p>
            <div className="mt-4 flex flex-col gap-3">
              {SEGMENTS.map((s) => (
                <div
                  key={s}
                  className="flex items-center gap-2 rounded-xl border border-border/60 bg-white px-4 py-3 text-sm text-nula-ink/80"
                >
                  <Sparkles className="size-4 shrink-0 text-nula-violet" />
                  &ldquo;{s}&rdquo;
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Pricing CTA */}
      <section className="px-4 py-16 md:px-6">
        <div className="mx-auto max-w-lg">
          <div className="overflow-hidden rounded-3xl border border-nula-violet/15 bg-white text-center shadow-xl shadow-nula-violet/10">
            <div className="border-b border-border/50 bg-gradient-to-b from-nula-violet/5 to-transparent px-8 py-10">
              <p className="text-sm font-semibold uppercase tracking-wide text-nula-violet">
                B2B Intelligence add-on
              </p>
              <div className="mt-4 flex items-end justify-center gap-1">
                <span className="text-6xl font-semibold tracking-tight text-nula-ink">$49</span>
                <span className="mb-2 text-nula-ink/55">/ month</span>
              </div>
              <p className="mt-2 text-sm text-nula-ink/55">
                Added to your Nula plan · 250 enrichments/month included
              </p>
              <Button
                render={<Link href={APP_ROUTES.signup} />}
                className="mt-7 w-full rounded-full px-6 shadow-md shadow-nula-violet/20"
                size="lg"
              >
                Start your free trial
              </Button>
              <p className="mt-3 text-xs text-nula-ink/50">
                Turn it on anytime from Settings → Plan · Cancel anytime
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-t border-border/60 bg-white px-4 py-16 md:px-6">
        <div className="mx-auto max-w-2xl">
          <h2 className="text-center text-2xl font-semibold tracking-tight text-nula-ink md:text-3xl">
            Questions, answered.
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
              Ready to know your leads before you call them?
            </h3>
            <p className="mt-2 text-sm text-nula-ink/65">
              Start free for 7 days, then add B2B Intelligence whenever you&apos;re ready.
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
