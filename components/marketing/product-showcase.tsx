"use client"

import { useCallback, useEffect, useState } from "react"
import { ChevronLeft, ChevronRight, Sparkles, X, ZoomIn } from "lucide-react"

import { cn } from "@/lib/utils"

type Shot = { src: string; alt: string; caption?: React.ReactNode }

const SHOTS: Shot[] = [
  {
    src: "/screenshots/dashboard.webp",
    alt: "Nula CRM dashboard showing lead stats, recent contacts, and recommended AI actions",
  },
  {
    src: "/screenshots/contacts.webp",
    alt: "Nula CRM contacts list with lifecycle stages and lead scores",
    caption: (
      <>
        <span className="font-medium text-nula-ink">Contacts</span> — every lead and customer,
        tagged and scored.
      </>
    ),
  },
  {
    src: "/screenshots/deals.webp",
    alt: "Nula CRM deals pipeline organized by stage",
    caption: (
      <>
        <span className="font-medium text-nula-ink">Deals</span> — a simple pipeline you can actually
        keep up with.
      </>
    ),
  },
  {
    src: "/screenshots/ai-command-center.webp",
    alt: "Nula CRM AI Command Center with action history and undo",
    caption: (
      <>
        <span className="font-medium text-nula-ink">AI Command Center</span> — describe it, preview
        it, approve it, undo it.
      </>
    ),
  },
  {
    src: "/screenshots/reports.webp",
    alt: "Nula CRM reports with leads by source and a lifecycle funnel",
    caption: (
      <>
        <span className="font-medium text-nula-ink">Reports</span> — leads by source, conversion, and
        campaign performance.
      </>
    ),
  },
  {
    src: "/screenshots/inbox.webp",
    alt: "Nula CRM unified inbox of email conversations and web leads",
    caption: (
      <>
        <span className="font-medium text-nula-ink">Inbox</span> — email conversations and web leads in
        one place.
      </>
    ),
  },
]

function ShotFrame({ src, alt, className }: { src: string; alt: string; className?: string }) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border border-nula-violet/10 bg-white shadow-xl shadow-nula-ink/10 transition-shadow group-hover:shadow-2xl group-hover:shadow-nula-ink/15",
        className,
      )}
    >
      <div className="flex items-center gap-1.5 border-b border-nula-violet/10 bg-nula-paper/70 px-3 py-2">
        <span className="size-2.5 rounded-full bg-nula-ink/15" />
        <span className="size-2.5 rounded-full bg-nula-ink/15" />
        <span className="size-2.5 rounded-full bg-nula-ink/15" />
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} loading="lazy" className="block w-full" />
      <span className="pointer-events-none absolute right-3 bottom-3 flex items-center gap-1 rounded-full bg-nula-ink/70 px-2.5 py-1 text-xs font-medium text-white opacity-0 transition-opacity group-hover:opacity-100">
        <ZoomIn className="size-3.5" />
        Zoom
      </span>
    </div>
  )
}

export function ProductShowcase() {
  const [index, setIndex] = useState<number | null>(null)
  const open = index !== null

  const close = useCallback(() => setIndex(null), [])
  const prev = useCallback(
    () => setIndex((i) => (i === null ? i : (i + SHOTS.length - 1) % SHOTS.length)),
    [],
  )
  const next = useCallback(
    () => setIndex((i) => (i === null ? i : (i + 1) % SHOTS.length)),
    [],
  )

  useEffect(() => {
    if (!open) return
    document.body.style.overflow = "hidden"
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close()
      else if (e.key === "ArrowLeft") prev()
      else if (e.key === "ArrowRight") next()
    }
    window.addEventListener("keydown", onKey)
    return () => {
      window.removeEventListener("keydown", onKey)
      document.body.style.overflow = ""
    }
  }, [open, close, prev, next])

  const active = index === null ? null : SHOTS[index]

  return (
    <section id="product" className="border-t border-border/60 bg-white py-20 md:py-24">
      <div className="mx-auto max-w-6xl px-4 md:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="inline-flex w-fit items-center gap-2 rounded-full bg-nula-violet/10 px-3.5 py-1.5 text-xs font-medium tracking-wide text-nula-violet">
            <Sparkles className="size-3.5" />
            See it in action
          </p>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-nula-ink md:text-4xl">
            Everything in one calm workspace
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-nula-ink/65">
            From first inquiry to repeat customer — contacts, deals, campaigns, reports, and an AI
            command bar that handles the busywork. Click any screen to zoom in.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIndex(0)}
          className="group mt-12 block w-full cursor-zoom-in rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nula-violet focus-visible:ring-offset-2"
          aria-label="Zoom in on the dashboard screenshot"
        >
          <ShotFrame src={SHOTS[0].src} alt={SHOTS[0].alt} />
        </button>

        <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {SHOTS.slice(1).map((shot, i) => (
            <figure key={shot.src} className="flex flex-col gap-3">
              <button
                type="button"
                onClick={() => setIndex(i + 1)}
                className="group block cursor-zoom-in rounded-xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nula-violet focus-visible:ring-offset-2"
                aria-label={`Zoom in on ${shot.alt}`}
              >
                <ShotFrame src={shot.src} alt={shot.alt} />
              </button>
              <figcaption className="text-sm text-nula-ink/70">{shot.caption}</figcaption>
            </figure>
          ))}
        </div>
      </div>

      {open && active ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Screenshot preview"
          className="fixed inset-0 z-[100] flex items-center justify-center bg-nula-ink/90 p-4 backdrop-blur-sm md:p-8"
          onClick={close}
        >
          <button
            type="button"
            onClick={close}
            aria-label="Close preview"
            className="absolute right-4 top-4 flex size-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
          >
            <X className="size-5" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              prev()
            }}
            aria-label="Previous screenshot"
            className="absolute left-3 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 md:left-6"
          >
            <ChevronLeft className="size-6" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              next()
            }}
            aria-label="Next screenshot"
            className="absolute right-3 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 md:right-6"
          >
            <ChevronRight className="size-6" />
          </button>

          <figure
            className="flex max-h-full max-w-6xl flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={active.src}
              alt={active.alt}
              className="max-h-[82vh] w-auto rounded-lg border border-white/10 shadow-2xl"
            />
            <figcaption className="mt-4 max-w-2xl text-center text-sm text-white/80">
              {active.alt}
            </figcaption>
          </figure>

          <span className="absolute bottom-5 left-1/2 -translate-x-1/2 text-xs font-medium text-white/50">
            {index + 1} / {SHOTS.length}
          </span>
        </div>
      ) : null}
    </section>
  )
}
