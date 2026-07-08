import Link from "next/link"

import { Logo } from "@/components/logo"
import { APP_ROUTES } from "@/lib/routes"

export function MarketingFooter() {
  return (
    <footer className="border-t border-border/60 bg-gradient-to-b from-white to-nula-paper">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 md:grid-cols-4 md:px-6">
        <div className="md:col-span-2">
          <div className="flex items-center gap-2.5">
            <Logo className="size-8" />
            <span className="font-semibold text-nula-ink">Nula CRM</span>
          </div>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-nula-ink/60">
            A better, easier way to manage customers for small business. Simple tools, real help,
            and AI that works with you — not against you.
          </p>
          <p className="mt-4 text-sm text-nula-ink/45">
            Made with care for owners who&apos;d rather grow than configure.
          </p>
        </div>
        <div>
          <h4 className="text-sm font-semibold text-nula-ink">Explore</h4>
          <ul className="mt-3 space-y-2.5 text-sm text-nula-ink/60">
            <li>
              <Link href="/#what-is-nula" className="transition-colors hover:text-nula-violet">
                What is Nula?
              </Link>
            </li>
            <li>
              <Link href={APP_ROUTES.pricing} className="transition-colors hover:text-nula-violet">
                Pricing
              </Link>
            </li>
            <li>
              <Link href={APP_ROUTES.faq} className="transition-colors hover:text-nula-violet">
                FAQ
              </Link>
            </li>
            <li>
              <Link href={APP_ROUTES.login} className="transition-colors hover:text-nula-violet">
                Login
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <h4 className="text-sm font-semibold text-nula-ink">Get in touch</h4>
          <ul className="mt-3 space-y-2.5 text-sm text-nula-ink/60">
            <li>
              <Link href="#about" className="transition-colors hover:text-nula-violet">
                About
              </Link>
            </li>
            <li>
              <Link href="#contact" className="transition-colors hover:text-nula-violet">
                Contact
              </Link>
            </li>
            <li>
              <a href="mailto:info@nulacrm.ai" className="transition-colors hover:text-nula-violet">
                info@nulacrm.ai
              </a>
            </li>
          </ul>
        </div>
      </div>
      <div className="flex flex-col items-center justify-between gap-3 border-t border-border/50 px-4 py-6 text-xs text-nula-ink/45 sm:flex-row md:px-6">
        <span>© {new Date().getFullYear()} Nula CRM. Here to help you grow.</span>
        <div className="flex items-center gap-4">
          <Link href={APP_ROUTES.privacy} className="transition-colors hover:text-nula-violet">
            Privacy
          </Link>
          <Link href={APP_ROUTES.terms} className="transition-colors hover:text-nula-violet">
            Terms
          </Link>
        </div>
      </div>
    </footer>
  )
}
