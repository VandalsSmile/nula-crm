import Link from "next/link"
import { ArrowRight, HelpCircle, Plus, Sparkles } from "lucide-react"

import { Button } from "@/components/ui/button"
import { APP_ROUTES } from "@/lib/routes"

type Faq = { q: string; a: string }

const PAIN_POINTS = [
  {
    problem: "\u201cI tried a CRM and gave up — it was too complicated.\u201d",
    fix: "Nula runs on plain English. Tell it what you want and it does the setup, filtering, and busywork for you.",
  },
  {
    problem: "\u201cI don\u2019t have time to keep it updated.\u201d",
    fix: "Nula captures leads, writes summaries, scores them, and logs activity automatically — so the CRM keeps itself current.",
  },
  {
    problem: "\u201cLeads slip through the cracks and I forget to follow up.\u201d",
    fix: "Every lead gets an AI-recommended next step, and automations follow up for you — nothing goes cold.",
  },
]

const FAQS: Faq[] = [
  {
    q: "I\u2019ve tried CRMs before and stopped using them — why is Nula different?",
    a: "Most CRMs make you the admin: endless fields, filters, and setup. Nula flips that. Its AI command bar lets you just say what you need — \u201cfind customers who haven\u2019t bought in 90 days\u201d or \u201cnormalize all my tags\u201d — and it does the work. There\u2019s nothing to maintain, so you actually keep using it.",
  },
  {
    q: "I don\u2019t have time for data entry. Does Nula really keep itself updated?",
    a: "Yes. When a lead comes in (from your website form, a webhook, or a CSV), Nula automatically creates the contact, scores it, writes a short AI summary, tags the source, and logs the activity. You spend time on customers, not spreadsheets.",
  },
  {
    q: "Leads keep slipping through the cracks. How does Nula stop that?",
    a: "Every contact gets an AI-recommended next action, and your dashboard surfaces exactly who needs attention today. Built-in automations run new-lead follow-up sequences and flag customers who\u2019ve gone quiet, so no opportunity is forgotten.",
  },
  {
    q: "I can\u2019t tell which leads are actually worth my time.",
    a: "Nula\u2019s AI scores every lead Hot, Warm, or Nurture based on source, intent, and behavior — so you call the right people first instead of guessing.",
  },
  {
    q: "I never know what to say in a follow-up.",
    a: "Ask Nula to draft one. The AI writes a friendly, on-point follow-up email you can review, tweak, and send in seconds — no blank page, no awkward wording.",
  },
  {
    q: "My contacts are a mess — duplicates and inconsistent tags.",
    a: "Tell Nula to \u201cfind duplicate contacts\u201d or \u201cnormalize all tags\u201d and it cleans things up in one step. You always see a preview first and can undo it if it\u2019s not what you wanted.",
  },
  {
    q: "Marketing and campaigns feel overwhelming.",
    a: "Nula drafts reactivation, nurture, review-request, and win-back campaigns for you, complete with a multi-step email/SMS sequence. Pick your audience, approve it, and it sends on schedule automatically.",
  },
  {
    q: "I can\u2019t tell what\u2019s actually working in my sales.",
    a: "The Reports view shows leads by source, your lifecycle funnel, conversion rate, and campaign performance at a glance — so you know where deals get stuck and where your best customers come from.",
  },
  {
    q: "I\u2019m nervous AI will change something I didn\u2019t approve.",
    a: "You\u2019re always in control. Every AI action follows the same flow: interpret \u2192 preview \u2192 approve \u2192 undo. Nothing changes until you say so, and you can reverse it if you change your mind.",
  },
  {
    q: "CRMs are built for big sales teams, not a business like mine.",
    a: "Nula is built specifically for small business owners. It\u2019s calm, simple, and tailored to your industry out of the box — no ops team or consultant required.",
  },
  {
    q: "How long does it take to get set up?",
    a: "Minutes. Sign up, answer two quick onboarding questions, and Nula seeds sensible tags, groups, and campaign ideas for your industry so you\u2019re productive immediately.",
  },
  {
    q: "What does it cost?",
    a: "You can get started for free — create your workspace and bring in your first contacts without a credit card.",
  },
]

export function MarketingFaq() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden marketing-warm-bg">
        <div className="pointer-events-none absolute -right-20 top-16 size-72 rounded-full bg-nula-violet/10 blur-3xl" />
        <div className="mx-auto max-w-3xl px-4 py-16 text-center md:px-6 md:py-24">
          <p className="inline-flex w-fit items-center gap-2 rounded-full bg-nula-violet/10 px-3.5 py-1.5 text-xs font-medium tracking-wide text-nula-violet">
            <HelpCircle className="size-3.5" />
            FAQ
          </p>
          <h1 className="mt-4 text-4xl font-semibold leading-[1.12] tracking-tight text-nula-ink md:text-5xl">
            Why CRMs fail small businesses —{" "}
            <span className="bg-gradient-to-r from-nula-violet via-[#6B5FF7] to-[#5b4de8] bg-clip-text text-transparent">
              and how Nula fixes it
            </span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-nula-ink/65">
            You didn&apos;t start your business to babysit software. Here are the real reasons CRMs
            and sales tracking break down for owners like you — and exactly how Nula&apos;s AI turns
            each one into an advantage.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
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
              className="rounded-full border-nula-violet/15 bg-white/80 px-6 text-nula-ink hover:bg-white"
              render={<Link href="/#how-we-help" />}
            >
              See how we help
            </Button>
          </div>
        </div>
      </section>

      {/* Pain points → fixes */}
      <section className="border-t border-border/60 bg-white py-20 md:py-24">
        <div className="mx-auto max-w-6xl px-4 md:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <p className="inline-flex w-fit items-center gap-2 rounded-full bg-nula-violet/10 px-3.5 py-1.5 text-xs font-medium tracking-wide text-nula-violet">
              <Sparkles className="size-3.5" />
              The real problem
            </p>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-nula-ink md:text-4xl">
              It&apos;s not you — it&apos;s the tools
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-nula-ink/65">
              Traditional CRMs are built for full-time admins and big sales teams. For a busy owner,
              they become one more thing to maintain. Nula uses AI to do that maintenance for you.
            </p>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {PAIN_POINTS.map((p) => (
              <div key={p.problem} className="flex flex-col gap-3 rounded-3xl border border-nula-violet/10 bg-nula-paper/50 p-6">
                <p className="text-base font-medium leading-snug text-nula-ink">{p.problem}</p>
                <p className="text-sm leading-relaxed text-nula-ink/65">{p.fix}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ list */}
      <section className="border-t border-border/60 marketing-warm-bg py-20 md:py-24">
        <div className="mx-auto max-w-3xl px-4 md:px-6">
          <h2 className="text-center text-3xl font-semibold tracking-tight text-nula-ink md:text-4xl">
            Questions owners ask us
          </h2>
          <div className="mt-10 flex flex-col gap-3">
            {FAQS.map((faq) => (
              <details
                key={faq.q}
                className="group rounded-2xl border border-nula-violet/10 bg-white/90 p-5 marketing-card-soft [&_summary::-webkit-details-marker]:hidden"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-base font-medium text-nula-ink">
                  {faq.q}
                  <Plus className="size-5 shrink-0 text-nula-violet transition-transform duration-200 group-open:rotate-45" />
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-nula-ink/70">{faq.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border/60 py-20 md:py-24">
        <div className="mx-auto max-w-6xl px-4 md:px-6">
          <div className="overflow-hidden rounded-[2rem] bg-gradient-to-br from-nula-ink via-[#2a2248] to-[#3d3280] px-8 py-14 text-center md:px-16">
            <h2 className="text-3xl font-semibold text-white md:text-4xl">
              Ready to stop fighting your CRM?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-lg leading-relaxed text-white/75">
              Create your free workspace in minutes and let AI handle the busywork.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Button
                size="lg"
                className="rounded-full bg-nula-signal px-7 text-nula-ink shadow-lg shadow-nula-signal/25 hover:bg-nula-signal/90"
                render={<Link href={APP_ROUTES.signup} />}
              >
                Get started free
                <ArrowRight data-icon="inline-end" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="rounded-full border-white/25 bg-white/5 px-7 text-white hover:bg-white/15"
                render={<Link href="/#contact" />}
              >
                Talk to us
              </Button>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
