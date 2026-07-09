import Link from "next/link"
import { redirect } from "next/navigation"
import { ArrowLeft, ShieldAlert } from "lucide-react"

import { Logo } from "@/components/logo"
import { getSessionUser } from "@/lib/auth-helpers"
import { isSuperAdminEmail } from "@/lib/superadmin"

export const metadata = {
  title: "System Console — Nula",
  robots: { index: false, follow: false },
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser()
  if (!user) redirect("/login?callbackURL=/dashboard")
  if (!isSuperAdminEmail(user.email)) redirect("/app/dashboard")

  return (
    <div className="min-h-svh bg-muted/30">
      <header className="border-b bg-background">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 md:px-6">
          <div className="flex items-center gap-2.5">
            <Logo className="size-8" />
            <div className="flex flex-col leading-tight">
              <span className="flex items-center gap-1.5 text-sm font-semibold">
                <ShieldAlert className="size-4 text-nula-violet" />
                Nula System Console
              </span>
              <span className="text-xs text-muted-foreground">{user.email}</span>
            </div>
          </div>
          <Link
            href="/app/dashboard"
            className="inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            Back to app
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8 md:px-6">{children}</main>
    </div>
  )
}
