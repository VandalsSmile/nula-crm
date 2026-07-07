"use client"

import Link from "next/link"
import { useState } from "react"
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
        href: "#what-is-nula",
        description: "A CRM built around conversation, not configuration.",
      },
      {
        label: "How it works",
        href: "#how-it-works",
        description: "Tell Nula what you need — it organizes, suggests, and executes.",
      },
      {
        label: "Who it's for",
        href: "#who-its-for",
        description: "Small businesses that want to sell more without CRM overhead.",
      },
    ],
  },
  {
    title: "Why Nula?",
    items: [
      {
        label: "Old CRM is broken",
        href: "#why-nula",
        description: "Bloated tools that decay, confuse, and slow you down.",
      },
      {
        label: "AI changes everything",
        href: "#ai-advantage",
        description: "Your CRM should respond to you — not the other way around.",
      },
      {
        label: "Less maintenance",
        href: "#less-overhead",
        description: "No more impossible tag systems and forgotten follow-ups.",
      },
    ],
  },
  {
    title: "How We Help",
    items: [
      {
        label: "Lead follow-up",
        href: "#how-we-help",
        description: "Never let a hot lead go cold again.",
      },
      {
        label: "Smart segmentation",
        href: "#segmentation",
        description: "Find the right people without building complex filters.",
      },
      {
        label: "Campaigns that convert",
        href: "#campaigns",
        description: "Reactivation, nurture, and outreach — drafted for you.",
      },
    ],
  },
]

function NavDropdown({ group }: { group: NavGroup }) {
  const [open, setOpen] = useState(false)

  return (
    <div
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-nula-ink/80 transition-colors hover:bg-white/60 hover:text-nula-ink"
        onClick={() => setOpen((v) => !v)}
      >
        {group.title}
        <ChevronDown className={cn("size-4 transition-transform", open && "rotate-180")} />
      </button>
      {open ? (
        <div className="absolute left-0 top-full z-50 mt-1 w-72 rounded-xl border border-border/80 bg-white p-2 shadow-xl shadow-nula-violet/10">
          {group.items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block rounded-lg px-3 py-2.5 transition-colors hover:bg-nula-paper"
              onClick={() => setOpen(false)}
            >
              <div className="text-sm font-medium text-nula-ink">{item.label}</div>
              {item.description ? (
                <div className="mt-0.5 text-xs leading-relaxed text-nula-mist">{item.description}</div>
              ) : null}
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  )
}

export function MarketingHeader() {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-nula-paper/80 backdrop-blur-lg">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 md:px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <Logo className="size-9" />
          <span className="text-lg font-semibold tracking-tight text-nula-ink">Nula</span>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          {NAV.map((group) => (
            <NavDropdown key={group.title} group={group} />
          ))}
          <Link
            href="#about"
            className="rounded-lg px-3 py-2 text-sm font-medium text-nula-ink/80 transition-colors hover:bg-white/60 hover:text-nula-ink"
          >
            About
          </Link>
          <Link
            href="#contact"
            className="rounded-lg px-3 py-2 text-sm font-medium text-nula-ink/80 transition-colors hover:bg-white/60 hover:text-nula-ink"
          >
            Contact
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          <Button render={<Link href={APP_ROUTES.login} />} variant="ghost" className="hidden sm:inline-flex">
            Login
          </Button>
          <Button render={<Link href={APP_ROUTES.login} />}>Get started</Button>
          <button
            type="button"
            className="inline-flex rounded-lg p-2 text-nula-ink lg:hidden"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {mobileOpen ? (
        <div className="border-t border-border/60 bg-white px-4 py-4 lg:hidden">
          <div className="flex flex-col gap-4">
            {NAV.map((group) => (
              <div key={group.title}>
                <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-nula-mist">
                  {group.title}
                </div>
                <div className="flex flex-col gap-1">
                  {group.items.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="rounded-lg px-3 py-2 text-sm text-nula-ink hover:bg-nula-paper"
                      onClick={() => setMobileOpen(false)}
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
            <Link href="#about" className="px-3 py-2 text-sm font-medium" onClick={() => setMobileOpen(false)}>
              About
            </Link>
            <Link href="#contact" className="px-3 py-2 text-sm font-medium" onClick={() => setMobileOpen(false)}>
              Contact
            </Link>
          </div>
        </div>
      ) : null}
    </header>
  )
}
