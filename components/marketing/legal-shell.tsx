import { MarketingFooter } from "@/components/marketing/marketing-footer"
import { MarketingHeader } from "@/components/marketing/marketing-header"

export function LegalShell({
  title,
  updated,
  intro,
  children,
}: {
  title: string
  updated: string
  intro?: string
  children: React.ReactNode
}) {
  return (
    <div className="light flex min-h-svh flex-col bg-nula-paper text-nula-ink">
      <MarketingHeader />
      <main className="flex-1 px-4 py-14 md:px-6 md:py-20">
        <article className="mx-auto max-w-3xl">
          <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">{title}</h1>
          <p className="mt-2 text-sm text-nula-ink/50">Last updated: {updated}</p>
          {intro ? (
            <p className="mt-6 text-base leading-relaxed text-nula-ink/70">{intro}</p>
          ) : null}
          <div className="mt-8 flex flex-col gap-8">{children}</div>
        </article>
      </main>
      <MarketingFooter />
    </div>
  )
}

export function LegalSection({
  heading,
  children,
}: {
  heading: string
  children: React.ReactNode
}) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-xl font-semibold text-nula-ink">{heading}</h2>
      <div className="flex flex-col gap-3 text-sm leading-relaxed text-nula-ink/70 [&_a]:text-nula-violet [&_a]:underline [&_li]:ml-1 [&_ul]:flex [&_ul]:list-disc [&_ul]:flex-col [&_ul]:gap-1.5 [&_ul]:pl-5">
        {children}
      </div>
    </section>
  )
}
