import Link from "next/link"
import { PauseCircle } from "lucide-react"

import { Logo } from "@/components/logo"

export const metadata = {
  title: "Account suspended — Nula CRM",
  robots: { index: false, follow: false },
}

export default function SuspendedPage() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 bg-nula-paper p-6 text-center text-nula-ink">
      <div className="flex items-center gap-2.5">
        <Logo className="size-9" />
        <span className="text-lg font-semibold tracking-tight">Nula CRM</span>
      </div>
      <div className="flex max-w-md flex-col items-center gap-3 rounded-2xl border border-border/60 bg-white p-8">
        <PauseCircle className="size-8 text-amber-500" />
        <h1 className="text-xl font-semibold">Your account is suspended</h1>
        <p className="text-sm leading-relaxed text-nula-ink/65">
          Access to this workspace is currently paused. Please contact us to restore your account.
        </p>
        <a
          href="mailto:info@nulacrm.ai"
          className="mt-1 text-sm font-medium text-nula-violet hover:underline"
        >
          info@nulacrm.ai
        </a>
        <Link href="/login" className="mt-2 text-xs text-nula-ink/50 hover:underline">
          Back to sign in
        </Link>
      </div>
    </div>
  )
}
