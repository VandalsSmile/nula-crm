import Link from "next/link"
import {
  ArrowRight,
  Bot,
  Clock,
  HandHeart,
  HeartHandshake,
  Layers,
  Megaphone,
  MessageCircle,
  Rocket,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  Users,
  Wand2,
  Undo2,
  X,
  Check,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { ContactForm } from "@/components/marketing/contact-form"
import {
  AboutIllustration,
  HeroIllustration,
  HowWeHelpIllustration,
  IllustrationFrame,
  WhatIsNulaIllustration,
  WhoItsForIllustration,
  WhyNulaIllustration,
} from "@/components/marketing/illustrations"
import { APP_ROUTES } from "@/lib/routes"
import { ProductShowcase } from "@/components/marketing/product-showcase"

/** Real, plain-English commands and what Nula does with them. */
const AI_EXAMPLES: { prompt: string; result: string }[] = [
  {
    prompt: "Show me leads who haven't booked in 60 days",
    result: "42 contacts found, grouped and ready to email — no filters to build.",
  },
  {
    prompt: "Draft a friendly follow-up to Maria about her consult",
    result: "A personalized draft, written in your voice, waiting for your approval.",
  },
  {
    prompt: "Find and merge duplicate contacts",
    result: "Matched on email & phone, merged cleanly — with one-click undo.",
  },
  {
    prompt: "Tag everyone who bought the Gold package",
    result: "Applied to 18 contacts in a single step, instead of one-by-one.",
  },
  {
    prompt: "Summarize and score this new website lead",
    result: "\u201cHot lead, score 88 — call within 15 minutes.\u201d Written for you.",
  },
  {
    prompt: "Build a win-back campaign for lapsed customers",
    result: "A multi-step email + SMS sequence, drafted in seconds. Launch when ready.",
  },
]

/** Task-by-task: the old way vs. the Nula way. */
const AI_COMPARISON: { task: string; old: string; nula: string }[] = [
  {
    task: "Segment your list",
    old: "Build multi-condition filters and hope they're right",
    nula: "Ask in plain English — get the exact group back",
  },
  {
    task: "Follow up a lead",
    old: "Remember to, write it, and hope it's on time",
    nula: "Auto-scored, summarized, and the reply drafted for you",
  },
  {
    task: "Clean up duplicates",
    old: "Export to a spreadsheet, dedupe by hand, re-import",
    nula: "\u201cMerge duplicates\u201d — matched and merged, with undo",
  },
  {
    task: "Launch a campaign",
    old: "Days of list-building and copywriting",
    nula: "Drafted in seconds, sent the moment you approve",
  },
  {
    task: "Get productive",
    old: "Weeks of configuration and training",
    nula: "Type what you need on day one",
  },
]

function SectionEyebrow({
  children,
  tone = "default",
}: {
  children: React.ReactNode
  tone?: "default" | "on-dark"
}) {
  return (
    <p
      className={
        tone === "on-dark"
          ? "inline-flex w-fit items-center gap-2 rounded-full border border-white/20 bg-white/15 px-3.5 py-1.5 text-xs font-medium tracking-wide text-white backdrop-blur-sm"
          : "inline-flex w-fit items-center gap-2 rounded-full bg-nula-violet/10 px-3.5 py-1.5 text-xs font-medium tracking-wide text-nula-violet"
      }
    >
      {children}
    </p>
  )
}

export function MarketingHome() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden marketing-warm-bg">
        <div className="pointer-events-none absolute -left-16 bottom-0 size-64 rounded-full bg-nula-signal/15 blur-3xl" />
        <div className="pointer-events-none absolute -right-20 top-24 size-80 rounded-full bg-nula-violet/10 blur-3xl" />
        <div className="mx-auto grid max-w-6xl gap-12 px-4 py-16 md:grid-cols-2 md:items-center md:px-6 md:py-24 lg:py-28">
          <div className="flex flex-col gap-6">
            <SectionEyebrow>
              <HandHeart className="size-3.5" />
              Made for small business owners
            </SectionEyebrow>
            <h1 className="text-4xl font-semibold leading-[1.12] tracking-tight text-nula-ink md:text-5xl lg:text-[3.25rem]">
              A better, easier way to{" "}
              <span className="bg-gradient-to-r from-nula-violet via-[#6B5FF7] to-[#5b4de8] bg-clip-text text-transparent">
                manage customers
              </span>
              .
            </h1>
            <p className="max-w-lg text-lg leading-relaxed text-nula-ink/65">
              Sell more without the CRM headache. Nula listens to what you need, keeps your contacts
              tidy, and helps you follow up — so you can get back to the people who matter.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button
                size="lg"
                className="rounded-full px-6 shadow-md shadow-nula-violet/20"
                render={<Link href={APP_ROUTES.signup} />}
              >
                Get started — it&apos;s free
                <ArrowRight data-icon="inline-end" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="rounded-full border-nula-violet/15 bg-white/80 px-6 hover:bg-white"
                render={<Link href="#how-it-works" />}
              >
                See how it works
              </Button>
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-2 pt-2 text-sm text-nula-ink/55">
              <span className="flex items-center gap-1.5">
                <Check className="size-4 text-nula-signal" />
                No IT team needed
              </span>
              <span className="flex items-center gap-1.5">
                <Check className="size-4 text-nula-signal" />
                You approve every action
              </span>
              <span className="flex items-center gap-1.5">
                <Check className="size-4 text-nula-signal" />
                Plain English, not jargon
              </span>
            </div>
          </div>
          <div className="relative">
            <div className="pointer-events-none absolute -right-6 -top-10 z-0 hidden w-full max-w-sm md:block lg:-right-10 lg:-top-14">
              <HeroIllustration className="opacity-95" />
            </div>
            <div className="absolute -inset-4 rounded-[2rem] bg-gradient-to-br from-nula-violet/10 via-transparent to-nula-signal/10" />
            <div className="relative z-10 rounded-[1.75rem] border border-white/80 bg-white/90 p-6 backdrop-blur-sm marketing-card-soft md:p-7">
              <div className="mb-4 flex items-center gap-2.5 text-sm text-nula-ink/60">
                <span className="flex size-8 items-center justify-center rounded-full bg-nula-signal/15">
                  <Bot className="size-4 text-[#0d8a75]" />
                </span>
                <span>Hey — what would you like to do today?</span>
              </div>
              <div className="rounded-2xl border border-nula-violet/10 bg-gradient-to-br from-nula-paper to-white p-4 text-sm leading-relaxed text-nula-ink">
                &quot;Find customers who haven&apos;t bought in 90 days and draft a friendly
                reactivation email for me.&quot;
              </div>
              <div className="mt-4 space-y-2.5">
                <div className="flex items-center gap-2.5 rounded-xl bg-nula-signal/12 px-3.5 py-2.5 text-xs font-medium text-[#0d6b5c]">
                  <Check className="size-3.5 shrink-0" />
                  Found 42 customers — ready when you are
                </div>
                <div className="flex items-center gap-2.5 rounded-xl bg-secondary/80 px-3.5 py-2.5 text-xs text-nula-ink/80">
                  <Check className="size-3.5 shrink-0 text-nula-violet" />
                  Draft campaign waiting for your thumbs-up
                </div>
              </div>
            </div>
            <IllustrationFrame className="marketing-card-soft mt-6 border-white/90 py-2 md:hidden">
              <HeroIllustration />
            </IllustrationFrame>
          </div>
        </div>
      </section>

      {/* Product showcase (client component — zoomable lightbox) */}
      <ProductShowcase />

      {/* What is Nula */}
      <section id="what-is-nula" className="border-t border-border/60 bg-white py-20 md:py-24">
        <div className="mx-auto max-w-6xl px-4 md:px-6">
          <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-14">
            <div className="max-w-2xl">
              <SectionEyebrow>
                <Sparkles className="size-3.5" />
                What is Nula?
              </SectionEyebrow>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight text-nula-ink md:text-4xl">
                Your CRM, without the complexity
              </h2>
              <p className="mt-4 text-lg leading-relaxed text-nula-ink/65">
                Nula is a friendly, AI-first CRM built for small teams. Tell it what you want — it
                organizes your people, suggests your next step, and never runs ahead without your OK.
              </p>
            </div>
            <IllustrationFrame className="marketing-card-soft">
              <WhatIsNulaIllustration />
            </IllustrationFrame>
          </div>
          <div id="how-it-works" className="mt-12 grid gap-5 md:grid-cols-3">
            {[
              {
                icon: MessageCircle,
                title: "Say what you need",
                body: "Just type or speak in everyday language. No filters to build, no manual to read.",
                tint: "bg-nula-violet/10 text-nula-violet",
              },
              {
                icon: ShieldCheck,
                title: "Preview before it runs",
                body: "See exactly what will change before anything happens. You're always in the driver's seat.",
                tint: "bg-nula-signal/15 text-[#0d8a75]",
              },
              {
                icon: Rocket,
                title: "Grow with confidence",
                body: "Follow-ups go out, segments stay fresh, and you stay focused on customers — not software.",
                tint: "bg-secondary text-nula-violet",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="group rounded-3xl border border-border/70 bg-nula-paper/50 p-6 transition-all hover:border-nula-violet/20 hover:bg-white hover:shadow-lg hover:shadow-nula-violet/5"
              >
                <div
                  className={`flex size-11 items-center justify-center rounded-2xl ${item.tint} transition-transform group-hover:scale-105`}
                >
                  <item.icon className="size-5" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-nula-ink">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-nula-ink/60">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* See the AI in action */}
      <section id="ai-in-action" className="border-t border-border/60 marketing-warm-bg py-20 md:py-24">
        <div className="mx-auto max-w-6xl px-4 md:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <SectionEyebrow>
              <Wand2 className="size-3.5" />
              See the AI in action
            </SectionEyebrow>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-nula-ink md:text-4xl">
              Just say it. Nula does the work.
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-nula-ink/65">
              Nula&apos;s AI isn&apos;t a chatbot bolted on the side — it&apos;s how you run the CRM.
              Type what you want in plain English; Nula figures it out, shows you a preview, and only
              acts when you say go. Changed your mind? Undo in one click.
            </p>
          </div>

          {/* Example command → result cards */}
          <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {AI_EXAMPLES.map((ex) => (
              <div
                key={ex.prompt}
                className="flex flex-col gap-3 rounded-3xl border border-white/80 bg-white/90 p-5 marketing-card-soft"
              >
                <div className="flex items-start gap-2.5 rounded-2xl border border-nula-violet/10 bg-nula-paper/70 px-3.5 py-3 text-sm leading-relaxed text-nula-ink">
                  <Sparkles className="mt-0.5 size-4 shrink-0 text-nula-violet" />
                  <span>&ldquo;{ex.prompt}&rdquo;</span>
                </div>
                <div className="flex items-start gap-2.5 px-1 text-sm leading-relaxed text-nula-ink/65">
                  <Check className="mt-0.5 size-4 shrink-0 text-nula-signal" />
                  <span>{ex.result}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Safety flow */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-2 text-xs font-medium text-nula-ink/60">
            {[
              { label: "Interpret", icon: Wand2 },
              { label: "Preview", icon: ShieldCheck },
              { label: "Approve", icon: Check },
              { label: "Undo anytime", icon: Undo2 },
            ].map((step, i) => (
              <span key={step.label} className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-white px-3 py-1.5">
                  <step.icon className="size-3.5 text-nula-violet" />
                  {step.label}
                </span>
                {i < 3 ? <ArrowRight className="size-3.5 text-nula-ink/30" /> : null}
              </span>
            ))}
          </div>

          {/* Traditional CRM vs Nula */}
          <div className="mt-16">
            <div className="mx-auto max-w-2xl text-center">
              <h3 className="text-2xl font-semibold tracking-tight text-nula-ink md:text-3xl">
                The AI difference
              </h3>
              <p className="mt-3 text-base leading-relaxed text-nula-ink/65">
                What used to take steps — or a specialist — is now a single sentence.
              </p>
            </div>
            <div className="mt-8 overflow-hidden rounded-2xl border border-border/70 bg-white marketing-card-soft">
              <div className="hidden grid-cols-3 gap-4 border-b border-border/60 bg-nula-paper/50 px-6 py-3 text-xs font-semibold uppercase tracking-wide text-nula-ink/50 md:grid">
                <span>The job</span>
                <span>Traditional CRM</span>
                <span className="text-nula-violet">With Nula</span>
              </div>
              <div className="divide-y divide-border/60">
                {AI_COMPARISON.map((row) => (
                  <div
                    key={row.task}
                    className="grid gap-2 px-6 py-4 md:grid-cols-3 md:items-center md:gap-4"
                  >
                    <span className="font-medium text-nula-ink">{row.task}</span>
                    <span className="flex items-start gap-2 text-sm leading-relaxed text-nula-ink/55">
                      <X className="mt-0.5 size-4 shrink-0 text-nula-mist" />
                      {row.old}
                    </span>
                    <span className="flex items-start gap-2 text-sm leading-relaxed text-nula-ink/80">
                      <Check className="mt-0.5 size-4 shrink-0 text-nula-signal" />
                      {row.nula}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-10 text-center">
            <Button
              size="lg"
              className="rounded-full px-6 shadow-md shadow-nula-violet/20"
              render={<Link href={APP_ROUTES.signup} />}
            >
              Try the AI free for 7 days
              <ArrowRight data-icon="inline-end" />
            </Button>
          </div>
        </div>
      </section>

      {/* Who it's for */}
      <section id="who-its-for" className="border-t border-border/60 py-20 md:py-24">
        <div className="mx-auto max-w-6xl px-4 md:px-6">
          <div className="overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#5c4de8] via-nula-violet to-[#3d2fb8] p-8 text-white md:p-12">
            <div className="grid items-center gap-8 lg:grid-cols-2 lg:gap-12">
              <div>
                <SectionEyebrow tone="on-dark">
                  <HeartHandshake className="size-3.5" />
                  Who it&apos;s for
                </SectionEyebrow>
                <h2 className="mt-4 text-2xl font-semibold md:text-3xl">
                  Built for owners who&apos;d rather serve customers than wrestle software
                </h2>
                <p className="mt-4 text-lg leading-relaxed text-white/85">
                  Whether you run a med spa, wellness studio, home service, or local shop — if you
                  want customers coming back (without a Salesforce-sized headache), you&apos;re in the
                  right place.
                </p>
                <div className="mt-8 flex flex-wrap gap-2.5">
                  {["IV & wellness", "Med spa", "Home services", "Fitness", "Local retail"].map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-white/20 bg-white/15 px-4 py-2 text-sm backdrop-blur-sm"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
              <IllustrationFrame variant="dark" className="border-white/15">
                <WhoItsForIllustration variant="dark" />
              </IllustrationFrame>
            </div>
          </div>
        </div>
      </section>

      {/* Why Nula - comparison */}
      <section id="why-nula" className="border-t border-border/60 bg-white py-20 md:py-24">
        <div className="mx-auto max-w-6xl px-4 md:px-6">
          <div className="text-center">
            <SectionEyebrow>
              <Sparkles className="size-3.5" />
              Why Nula?
            </SectionEyebrow>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-nula-ink md:text-4xl">
              CRM shouldn&apos;t feel like a second job
            </h2>
            <p id="ai-advantage" className="mx-auto mt-4 max-w-2xl text-lg leading-relaxed text-nula-ink/65">
              Most CRMs were built to store data. Nula was built to help you grow — with AI that
              makes the hard parts feel simple.
            </p>
          </div>
          <IllustrationFrame className="mx-auto mt-10 max-w-2xl marketing-card-soft py-4 md:max-w-3xl">
            <WhyNulaIllustration />
          </IllustrationFrame>
          <div className="mt-12 grid gap-6 md:grid-cols-2">
            <div className="rounded-3xl border border-border/70 bg-nula-paper/40 p-6 md:p-8">
              <h3 className="flex items-center gap-2 text-lg font-semibold text-nula-ink/50">
                <span className="flex size-8 items-center justify-center rounded-full bg-muted">
                  <X className="size-4" />
                </span>
                Sound familiar?
              </h3>
              <ul className="mt-6 space-y-4 text-sm leading-relaxed text-nula-ink/55">
                {[
                  "Tags and lists that nobody keeps up with",
                  "Leads that quietly go cold",
                  "Filters only your most technical person understands",
                  "Hours lost clicking around instead of selling",
                  "Campaigns that feel impossible to launch",
                ].map((item) => (
                  <li key={item} className="flex gap-3">
                    <X className="mt-0.5 size-4 shrink-0 text-nula-mist" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div
              id="less-overhead"
              className="rounded-3xl border-2 border-nula-violet/20 bg-gradient-to-br from-white to-nula-paper p-6 marketing-card-soft md:p-8"
            >
              <h3 className="flex items-center gap-2 text-lg font-semibold text-nula-violet">
                <span className="flex size-8 items-center justify-center rounded-full bg-nula-signal/20">
                  <Sparkles className="size-4 text-[#0d8a75]" />
                </span>
                There&apos;s a kinder way
              </h3>
              <ul className="mt-6 space-y-4 text-sm leading-relaxed text-nula-ink/75">
                {[
                  "AI keeps things organized as you work",
                  "Every lead scored and summarized for you",
                  "Segments in plain English — just ask",
                  "Your CRM responds to you, not the other way around",
                  "Campaigns drafted in seconds, launched when you're ready",
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
      <section id="how-we-help" className="border-t border-border/60 marketing-warm-bg py-20 md:py-24">
        <div className="mx-auto max-w-6xl px-4 md:px-6">
          <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-14">
            <div className="max-w-2xl">
              <SectionEyebrow>
                <HandHeart className="size-3.5" />
                How we help
              </SectionEyebrow>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight text-nula-ink md:text-4xl">
                We handle the busywork. You handle the relationships.
              </h2>
              <p className="mt-4 text-lg leading-relaxed text-nula-ink/65">
                A good CRM does one thing: helps you sell more. Nula takes care of the messy middle so
                you can show up for your customers.
              </p>
            </div>
            <IllustrationFrame className="marketing-card-soft border-white/90">
              <HowWeHelpIllustration />
            </IllustrationFrame>
          </div>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                id: "segmentation",
                icon: Layers,
                title: "Sort contacts instantly",
                body: "Who hasn't bought in 90 days? Who's ready to hear from you? Just ask.",
                tint: "bg-nula-violet/10 text-nula-violet",
              },
              {
                icon: Clock,
                title: "Warm lead follow-up",
                body: "New inquiries get scored, summarized, and routed — so nobody slips away.",
                tint: "bg-nula-signal/15 text-[#0d8a75]",
              },
              {
                id: "campaigns",
                icon: Megaphone,
                title: "Outreach that feels personal",
                body: "Reactivation and nurture emails drafted for you — edit, approve, send.",
                tint: "bg-amber-50 text-amber-700",
              },
              {
                icon: Users,
                title: "Contacts that stay tidy",
                body: "Duplicates caught, tags normalized, intake handled — without the decay.",
                tint: "bg-sky-50 text-sky-700",
              },
              {
                icon: Target,
                title: "Clear next steps",
                body: "Every contact gets a suggested action. Less guessing, more doing.",
                tint: "bg-rose-50 text-rose-700",
              },
              {
                icon: TrendingUp,
                title: "Grow without the grind",
                body: "Less time in software. More time with the people who keep your business going.",
                tint: "bg-secondary text-nula-violet",
              },
            ].map((feature) => (
              <div
                key={feature.title}
                id={feature.id}
                className="rounded-3xl border border-white/80 bg-white/90 p-6 transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-nula-violet/8"
              >
                <div className={`flex size-11 items-center justify-center rounded-2xl ${feature.tint}`}>
                  <feature.icon className="size-5" />
                </div>
                <h3 className="mt-4 font-semibold text-nula-ink">{feature.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-nula-ink/60">{feature.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* About */}
      <section id="about" className="border-t border-border/60 bg-white py-20 md:py-24">
        <div className="mx-auto max-w-3xl px-4 text-center md:px-6">
          <IllustrationFrame className="mx-auto mb-10 max-w-md marketing-card-soft">
            <AboutIllustration />
          </IllustrationFrame>
          <SectionEyebrow>
            <HeartHandshake className="size-3.5" />
            About us
          </SectionEyebrow>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-nula-ink md:text-4xl">
            We built Nula for people like you
          </h2>
          <p className="mt-6 text-lg leading-relaxed text-nula-ink/65">
            Small business owners deserve tools that respect their time. You shouldn&apos;t need a
            marketing ops expert to follow up with a lead, sort your best customers, or send a
            win-back email. AI finally makes that possible — simple when you want simple, powerful
            when you need it.
          </p>
          <blockquote className="mt-10 rounded-3xl border border-nula-violet/10 bg-nula-paper/60 px-6 py-8 text-left md:px-8">
            <p className="text-base leading-relaxed text-nula-ink/75 italic">
              &quot;We started Nula because we kept hearing the same story: owners loved their
              customers but hated their CRM. It was always too much tool and not enough help.&quot;
            </p>
            <footer className="mt-4 text-sm font-medium text-nula-violet">— The Nula team</footer>
          </blockquote>
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className="border-t border-border/60 py-20 md:py-24">
        <div className="mx-auto max-w-6xl px-4 md:px-6">
          <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-nula-ink via-[#2a2248] to-[#3d3280] px-6 py-10 md:px-12 md:py-14">
            <div className="pointer-events-none absolute -right-16 -top-16 size-64 rounded-full bg-nula-violet/20 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-20 -left-16 size-64 rounded-full bg-nula-signal/15 blur-3xl" />
            <div className="relative grid gap-10 md:grid-cols-2 md:items-center">
              <div className="text-center md:text-left">
                <p className="text-sm font-medium uppercase tracking-wider text-nula-signal">
                  You&apos;re invited
                </p>
                <h2 className="mt-3 text-3xl font-semibold text-white md:text-4xl">
                  Ready for a CRM that actually helps?
                </h2>
                <p className="mx-auto mt-4 max-w-md text-lg leading-relaxed text-white/75 md:mx-0">
                  Join small business owners who are spending less time in software and more time
                  growing. Send us a note and we&apos;ll be in touch.
                </p>
                <div className="mt-8 flex flex-wrap justify-center gap-3 md:justify-start">
                <Button
                  size="lg"
                  className="rounded-full bg-nula-signal px-7 text-nula-ink shadow-lg shadow-nula-signal/25 hover:bg-nula-signal/90"
                  render={<Link href={APP_ROUTES.signup} />}
                >
                  Get started free
                  <ArrowRight data-icon="inline-end" />
                </Button>
                </div>
                <p className="mt-6 text-sm text-white/50">
                  Prefer email? Reach us at{" "}
                  <a href="mailto:info@nulacrm.ai" className="text-nula-signal hover:underline">
                    info@nulacrm.ai
                  </a>
                </p>
              </div>
              <ContactForm />
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
