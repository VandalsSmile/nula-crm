"use client"

import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { ChevronDown, Menu, X } from "lucide-react"

import { Logo } from "@/components/logo"
import { Button } from "@/components/ui/button"
import { APP_ROUTES } from "@/lib/routes"
import { cn } from "@/lib/utils"

type NavItem = {
  label: string
  href: string
  description?: string
}

type NavGroup = {
  title: string
  items: NavItem[]
}

const NAV: NavGroup[] = [
  {
    title: "What is Nula?",
    items: [
      {
        label: "AI-first CRM",
        href: "/#what-is-nula",
        description: "A CRM built around conversation, not configuration.",
      },
      {
        label: "How it works",
        href: "/#how-it-works",
        description: "Tell Nula what you need — it organizes, suggests, and executes.",
      },
      {
        label: "Who it's for",
        href: "/#who-its-for",
        description: "Small businesses that want to sell more without CRM overhead.",
      },
    ],
  },
  {
    title: "Why Nula?",
    items: [
      {
        label: "Old CRM is broken",
        href: "/#why-nula",
        description: "Bloated tools that decay, confuse, and slow you down.",
      },
      {
        label: "AI changes everything",
        href: "/#ai-advantage",
        description: "Your CRM should respond to you — not the other way around.",
      },
      {
        label: "Less maintenance",
        href: "/#less-overhead",
        description: "No more impossible tag systems and forgotten follow-ups.",
      },
    ],
  },
  {
    title: "How We Help",
    items: [
      {
        label: "Lead follow-up",
        href: "/#how-we-help",
        description: "Never let a hot lead go cold again.",
      },
      {
        label: "Smart segmentation",
        href: "/#segmentation",
        description: "Find the right people without building complex filters.",
      },
      {
        label: "Campaigns that convert",
        href: "/#campaigns",
        description: "Reactivation, nurture, and outreach — drafted for you.",
      },
    ],
  },
]

const navLinkClass =
  "rounded-full px-3.5 py-2 text-sm font-medium text-nula-ink/70 transition-colors hover:bg-white hover:text-nula-ink"

const CLOSE_DELAY_MS = 200

function NavDropdown({ group }: { group: NavGroup }) {
  const [open, setOpen] = useState(false)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)

  const clearCloseTimer = () => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current)
      closeTimer.current = null
    }
  }

  const scheduleClose = () => {
    clearCloseTimer()
    closeTimer.current = setTimeout(() => setOpen(false), CLOSE_DELAY_MS)
  }

  const openMenu = () => {
    clearCloseTimer()
    setOpen(true)
  }

  useEffect(() => {
    if (!open) return

    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false)
    }

    document.addEventListener("pointerdown", onPointerDown)
    document.addEventListener("keydown", onKeyDown)
    return () => {
      document.removeEventListener("pointerdown", onPointerDown)
      document.removeEventListener("keydown", onKeyDown)
    }
  }, [open])

  useEffect(() => () => clearCloseTimer(), [])

  return (
    <div
      ref={rootRef}
      className="relative"
      onMouseEnter={openMenu}
      onMouseLeave={scheduleClose}
      onFocusCapture={openMenu}
      onBlurCapture={(event) => {
        if (!rootRef.current?.contains(event.relatedTarget as Node)) {
          scheduleClose()
        }
      }}
    >
      <button
        type="button"
        className={cn(navLinkClass, "flex items-center gap-1")}
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => {
          clearCloseTimer()
          setOpen((v) => !v)
        }}
      >
        {group.title}
        <ChevronDown className={cn("size-4 transition-transform duration-200", open && "rotate-180")} />
      </button>
      {open ? (
        <div
          className="absolute left-0 top-full z-50 pt-2"
          onMouseEnter={openMenu}
          onMouseLeave={scheduleClose}
        >
          <div
            role="menu"
            className="w-72 rounded-2xl border border-border/60 bg-white/95 p-2 shadow-xl shadow-nula-violet/10 backdrop-blur-md"
          >
            {group.items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                role="menuitem"
                className="block rounded-xl px-3.5 py-3 transition-colors hover:bg-nula-paper"
                onClick={() => setOpen(false)}
              >
                <div className="text-sm font-medium text-nula-ink">{item.label}</div>
                {item.description ? (
                  <div className="mt-0.5 text-xs leading-relaxed text-nula-ink/55">{item.description}</div>
                ) : null}
              </Link>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}

export function MarketingHeader() {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <header className="sticky top-0 z-40 border-b border-border/40 bg-nula-paper/70 backdrop-blur-xl">
      <div className="mx-auto flex h-[4.25rem] max-w-6xl items-center justify-between gap-4 px-4 md:px-6">
        <Link href="/" className="group flex items-center gap-2.5">
          <Logo className="size-9 transition-transform group-hover:scale-105" />
          <div className="flex flex-col leading-tight">
            <span className="text-lg font-semibold tracking-tight text-nula-ink">Nula</span>
            <span className="hidden text-[10px] font-medium text-nula-ink/45 sm:block">
              CRM for small business
            </span>
          </div>
        </Link>

        <nav className="hidden items-center gap-0.5 lg:flex">
          {NAV.map((group) => (
            <NavDropdown key={group.title} group={group} />
          ))}
          <Link href={APP_ROUTES.pricing} className={navLinkClass}>
            Pricing
          </Link>
          <Link href={APP_ROUTES.faq} className={navLinkClass}>
            FAQ
          </Link>
          <Link href="/#about" className={navLinkClass}>
            About
          </Link>
          <Link href="/#contact" className={navLinkClass}>
            Contact
          </Link>
        </nav>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <Button
            render={<Link href={APP_ROUTES.login} />}
            variant="ghost"
            className="hidden rounded-full sm:inline-flex"
          >
            Login
          </Button>
          <Button
            render={<Link href={APP_ROUTES.signup} />}
            className="hidden rounded-full px-4 shadow-md shadow-nula-violet/15 min-[420px]:inline-flex"
          >
            Get started
          </Button>
          <Button
            render={<Link href={APP_ROUTES.signup} />}
            size="sm"
            className="rounded-full px-3 shadow-md shadow-nula-violet/15 min-[420px]:hidden"
          >
            Start
          </Button>
          <button
            type="button"
            className="inline-flex rounded-full p-2.5 text-nula-ink transition-colors hover:bg-white lg:hidden"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {mobileOpen ? (
        <div className="max-h-[calc(100dvh-4.25rem)] overflow-y-auto border-t border-border/40 bg-white/95 px-4 py-5 backdrop-blur-md lg:hidden">
          <div className="flex flex-col gap-4">
            {NAV.map((group) => (
              <div key={group.title}>
                <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-nula-ink/40">
                  {group.title}
                </div>
                <div className="flex flex-col gap-0.5">
                  {group.items.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="rounded-xl px-3 py-2.5 text-sm text-nula-ink hover:bg-nula-paper"
                      onClick={() => setMobileOpen(false)}
                    >
                      <div className="font-medium">{item.label}</div>
                      {item.description ? (
                        <div className="mt-0.5 text-xs leading-relaxed text-nula-ink/55">{item.description}</div>
                      ) : null}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
            <Link
              href={APP_ROUTES.pricing}
              className="rounded-xl px-3 py-2.5 text-sm font-medium text-nula-ink hover:bg-nula-paper"
              onClick={() => setMobileOpen(false)}
            >
              Pricing
            </Link>
            <Link
              href={APP_ROUTES.faq}
              className="rounded-xl px-3 py-2.5 text-sm font-medium text-nula-ink hover:bg-nula-paper"
              onClick={() => setMobileOpen(false)}
            >
              FAQ
            </Link>
            <Link
              href="/#about"
              className="rounded-xl px-3 py-2.5 text-sm font-medium text-nula-ink hover:bg-nula-paper"
              onClick={() => setMobileOpen(false)}
            >
              About
            </Link>
            <Link
              href="/#contact"
              className="rounded-xl px-3 py-2.5 text-sm font-medium text-nula-ink hover:bg-nula-paper"
              onClick={() => setMobileOpen(false)}
            >
              Contact
            </Link>
          </div>
        </div>
      ) : null}
    </header>
  )
}
