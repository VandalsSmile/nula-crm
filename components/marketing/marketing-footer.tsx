import Link from "next/link"

import { Logo } from "@/components/logo"
import { APP_ROUTES } from "@/lib/routes"

export function MarketingFooter() {
  return (
    <footer className="border-t border-border bg-white">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 md:grid-cols-4 md:px-6">
        <div className="md:col-span-2">
          <div className="flex items-center gap-2.5">
            <Logo className="size-8" />
            <span className="font-semibold text-nula-ink">Nula CRM</span>
          </div>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-nula-mist">
            Customer management that works the way you do. AI-powered, simple, and built for small
            businesses that want to sell more — not wrestle with software.
          </p>
        </div>
        <div>
          <h4 className="text-sm font-semibold text-nula-ink">Product</h4>
          <ul className="mt-3 space-y-2 text-sm text-nula-mist">
            <li><Link href="#what-is-nula" className="hover:text-nula-violet">What is Nula?</Link></li>
            <li><Link href="#why-nula" className="hover:text-nula-violet">Why Nula?</Link></li>
            <li><Link href="#how-we-help" className="hover:text-nula-violet">How we help</Link></li>
            <li><Link href={APP_ROUTES.login} className="hover:text-nula-violet">Log in</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-sm font-semibold text-nula-ink">Company</h4>
          <ul className="mt-3 space-y-2 text-sm text-nula-mist">
            <li><Link href="#about" className="hover:text-nula-violet">About</Link></li>
            <li><Link href="#contact" className="hover:text-nula-violet">Contact</Link></li>
            <li><a href="mailto:info@nulacrm.ai" className="hover:text-nula-violet">info@nulacrm.ai</a></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border px-4 py-6 text-center text-xs text-nula-mist md:px-6">
        © {new Date().getFullYear()} Nula CRM. All rights reserved.
      </div>
    </footer>
  )
}
