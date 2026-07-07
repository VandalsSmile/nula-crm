import Link from "next/link"
import {
  ArrowRight,
  Bot,
  Clock,
  Layers,
  Megaphone,
  Sparkles,
  Target,
  TrendingUp,
  Users,
  X,
  Check,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { APP_ROUTES } from "@/lib/routes"

export function MarketingHome() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(79,61,245,0.18),transparent)]" />
        <div className="pointer-events-none absolute -right-24 top-20 size-72 rounded-full bg-nula-signal/10 blur-3xl" />
        <div className="mx-auto grid max-w-6xl gap-12 px-4 py-20 md:grid-cols-2 md:items-center md:px-6 md:py-28">
          <div className="flex flex-col gap-6">
            <p className="inline-flex w-fit items-center gap-2 rounded-full border border-nula-violet/20 bg-white px-3 py-1 text-xs font-medium text-nula-violet">
              <Sparkles className="size-3.5" />
              AI-first customer management
            </p>
            <h1 className="text-4xl font-semibold leading-[1.1] tracking-tight text-nula-ink md:text-5xl lg:text-6xl">
              Sell more.{" "}
              <span className="bg-gradient-to-r from-nula-violet to-[#6B5FF7] bg-clip-text text-transparent">
                Spend less time
              </span>{" "}
              in your CRM.
            </h1>
            <p className="max-w-lg text-lg leading-relaxed text-nula-mist">
              The easier way for small businesses to manage customers — powered by AI that
              responds to you, not the other way around.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button size="lg" render={<Link href={APP_ROUTES.login} />}>
                Get started free
                <ArrowRight data-icon="inline-end" />
              </Button>
              <Button size="lg" variant="outline" render={<Link href="#how-it-works" />}>
                See how it works
              </Button>
            </div>
          </div>
          <div className="relative">
            <div className="rounded-2xl border border-border/80 bg-white p-6 shadow-2xl shadow-nula-violet/10">
              <div className="mb-4 flex items-center gap-2 text-sm text-nula-mist">
                <Bot className="size-4 text-nula-signal" />
                What do you want to do?
              </div>
              <div className="rounded-xl border border-nula-violet/15 bg-nula-paper p-4 text-sm text-nula-ink">
                &quot;Find customers who haven&apos;t bought in 90 days and draft a reactivation
                campaign.&quot;
              </div>
              <div className="mt-4 space-y-2">
                <div className="flex items-center gap-2 rounded-lg bg-nula-signal/10 px-3 py-2 text-xs text-[#0d5c4e]">
                  <Check className="size-3.5" />
                  Found 42 inactive customers
                </div>
                <div className="flex items-center gap-2 rounded-lg bg-secondary px-3 py-2 text-xs text-nula-ink">
                  <Check className="size-3.5 text-nula-violet" />
                  Campaign draft ready for your approval
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* What is Nula */}
      <section id="what-is-nula" className="border-t border-border bg-white py-20 md:py-24">
        <div className="mx-auto max-w-6xl px-4 md:px-6">
          <div className="max-w-2xl">
            <h2 className="text-3xl font-semibold tracking-tight text-nula-ink md:text-4xl">
              What is Nula?
            </h2>
            <p className="mt-4 text-lg text-nula-mist">
              Nula is a simple, AI-first CRM for small businesses. Tell it what you want done — it
              organizes your contacts, suggests the right next move, and helps you execute safely.
            </p>
          </div>
          <div id="how-it-works" className="mt-12 grid gap-6 md:grid-cols-3">
            {[
              {
                step: "1",
                title: "Say what you need",
                body: "Use plain language. No complex filters, no training manual.",
              },
              {
                step: "2",
                title: "Preview before it runs",
                body: "Nula shows you exactly what will change — you approve bulk actions.",
              },
              {
                step: "3",
                title: "Execute and grow",
                body: "Follow-ups, segments, and campaigns go out. You stay focused on selling.",
              },
            ].map((item) => (
              <div key={item.step} className="rounded-2xl border border-border bg-nula-paper p-6">
                <div className="flex size-8 items-center justify-center rounded-full bg-nula-violet text-sm font-bold text-white">
                  {item.step}
                </div>
                <h3 className="mt-4 text-lg font-semibold text-nula-ink">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-nula-mist">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Who it's for */}
      <section id="who-its-for" className="border-t border-border py-20 md:py-24">
        <div className="mx-auto max-w-6xl px-4 md:px-6">
          <div className="rounded-3xl bg-gradient-to-br from-nula-violet to-[#2a1f6e] p-8 text-white md:p-12">
            <h2 className="text-2xl font-semibold md:text-3xl">Built for owners, not IT departments</h2>
            <p className="mt-4 max-w-2xl text-lg text-white/80">
              Med spas, wellness studios, home services, local retail — if you need customers to come
              back and referrals to grow, but don&apos;t have time for Salesforce, Nula is for you.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              {["IV & wellness", "Med spa", "Home services", "Fitness", "Local retail"].map((tag) => (
                <span key={tag} className="rounded-full bg-white/10 px-4 py-1.5 text-sm">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Why Nula - comparison */}
      <section id="why-nula" className="border-t border-border bg-white py-20 md:py-24">
        <div className="mx-auto max-w-6xl px-4 md:px-6">
          <div className="text-center">
            <h2 className="text-3xl font-semibold tracking-tight text-nula-ink md:text-4xl">
              Why Nula?
            </h2>
            <p id="ai-advantage" className="mx-auto mt-4 max-w-2xl text-lg text-nula-mist">
              Old CRMs were built for data hoarding. Nula is built for revenue — with AI that makes
              the hard stuff look easy.
            </p>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-border p-6 md:p-8">
              <h3 className="flex items-center gap-2 text-lg font-semibold text-nula-mist">
                <X className="size-5" />
                The old way
              </h3>
              <ul className="mt-6 space-y-4 text-sm text-nula-mist">
                {[
                  "Messy tags nobody maintains",
                  "Leads slip through the cracks",
                  "Complex filters only power users understand",
                  "CRM becomes a second job",
                  "Campaigns take hours to set up",
                ].map((item) => (
                  <li key={item} className="flex gap-3">
                    <X className="mt-0.5 size-4 shrink-0 text-destructive/70" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div
              id="less-overhead"
              className="rounded-2xl border-2 border-nula-violet/30 bg-nula-paper p-6 shadow-lg shadow-nula-violet/5 md:p-8"
            >
              <h3 className="flex items-center gap-2 text-lg font-semibold text-nula-violet">
                <Sparkles className="size-5 text-nula-signal" />
                The Nula way
              </h3>
              <ul className="mt-6 space-y-4 text-sm text-nula-ink">
                {[
                  "AI cleans and organizes as you go",
                  "Every lead scored and summarized automatically",
                  "Segments in plain English",
                  "Zero overhead — it responds to you",
                  "Campaigns drafted in seconds, approved by you",
                ].map((item) => (
                  <li key={item} className="flex gap-3">
                    <Check className="mt-0.5 size-4 shrink-0 text-nula-signal" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* How we help */}
      <section id="how-we-help" className="border-t border-border py-20 md:py-24">
        <div className="mx-auto max-w-6xl px-4 md:px-6">
          <div className="max-w-2xl">
            <h2 className="text-3xl font-semibold tracking-tight text-nula-ink md:text-4xl">
              How we help you sell more
            </h2>
            <p className="mt-4 text-lg text-nula-mist">
              CRMs should do one thing well: help you grow. Nula handles the busywork so you can
              focus on customers.
            </p>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                id: "segmentation",
                icon: Layers,
                title: "Sort contacts instantly",
                body: "Who hasn't bought in 90 days? Who's a hot lead? Just ask.",
              },
              {
                icon: Clock,
                title: "Lead follow-up on autopilot",
                body: "New inquiries get scored, summarized, and routed — automatically.",
              },
              {
                id: "campaigns",
                icon: Megaphone,
                title: "Outreach that converts",
                body: "Reactivation, nurture, win-back — AI drafts, you approve, Nula tracks.",
              },
              {
                icon: Users,
                title: "Contacts that stay clean",
                body: "Duplicate detection, tag normalization, and smart intake — no decay.",
              },
              {
                icon: Target,
                title: "Know your next move",
                body: "Every contact gets a recommended action. No guessing.",
              },
              {
                icon: TrendingUp,
                title: "Grow without the grind",
                body: "Less time in software. More time with customers who buy.",
              },
            ].map((feature) => (
              <div
                key={feature.title}
                id={feature.id}
                className="rounded-2xl border border-border bg-white p-6 transition-shadow hover:shadow-lg hover:shadow-nula-violet/5"
              >
                <div className="flex size-10 items-center justify-center rounded-xl bg-nula-violet/10 text-nula-violet">
                  <feature.icon className="size-5" />
                </div>
                <h3 className="mt-4 font-semibold text-nula-ink">{feature.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-nula-mist">{feature.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* About */}
      <section id="about" className="border-t border-border bg-white py-20 md:py-24">
        <div className="mx-auto max-w-3xl px-4 text-center md:px-6">
          <h2 className="text-3xl font-semibold tracking-tight text-nula-ink md:text-4xl">About Nula</h2>
          <p className="mt-6 text-lg leading-relaxed text-nula-mist">
            We built Nula because small business owners deserve better than bloated enterprise CRMs.
            You shouldn&apos;t need a marketing ops expert to follow up with leads, segment customers,
            or run a reactivation campaign. AI finally makes that possible — simple by default,
            powerful when you need it.
          </p>
        </div>
      </section>

      {/* Contact CTA */}
      <section id="contact" className="border-t border-border py-20 md:py-24">
        <div className="mx-auto max-w-6xl px-4 md:px-6">
          <div className="rounded-3xl bg-gradient-to-br from-nula-ink to-[#2d2454] px-8 py-12 text-center md:px-16 md:py-16">
            <h2 className="text-3xl font-semibold text-white md:text-4xl">
              Ready for a CRM that works for you?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-white/70">
              Stop fighting your software. Start growing your business.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Button
                size="lg"
                className="bg-nula-signal text-nula-ink hover:bg-nula-signal/90"
                render={<Link href={APP_ROUTES.login} />}
              >
                Get started
                <ArrowRight data-icon="inline-end" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-white/30 bg-transparent text-white hover:bg-white/10"
                render={<a href="mailto:info@nulacrm.ai" />}
              >
                Contact us
              </Button>
            </div>
            <p className="mt-6 text-sm text-white/50">
              Questions? Email{" "}
              <a href="mailto:info@nulacrm.ai" className="text-nula-signal hover:underline">
                info@nulacrm.ai
              </a>
            </p>
          </div>
        </div>
      </section>
    </>
  )
}
