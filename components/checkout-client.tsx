"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { initializePaddle } from "@paddle/paddle-js"
import { Loader2 } from "lucide-react"

import { Logo } from "@/components/logo"
import { APP_ROUTES } from "@/lib/routes"

const PADDLE_ENV =
  process.env.NEXT_PUBLIC_PADDLE_ENV === "production" ? "production" : "sandbox"
const PADDLE_CLIENT_TOKEN = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN

/**
 * Public checkout landing page used as Paddle's "default payment link".
 * Paddle redirects here with `?_ptxn=<transaction_id>`; once Paddle.js is
 * initialized it automatically opens the checkout overlay for that transaction.
 */
export function CheckoutClient() {
  // NEXT_PUBLIC_* is inlined at build time, so this is stable across SSR/CSR.
  const [error, setError] = useState<string | null>(
    PADDLE_CLIENT_TOKEN ? null : "Checkout isn't available right now.",
  )

  useEffect(() => {
    if (!PADDLE_CLIENT_TOKEN) return
    let cancelled = false
    initializePaddle({ environment: PADDLE_ENV, token: PADDLE_CLIENT_TOKEN }).catch(() => {
      if (!cancelled) setError("We couldn't load the checkout. Please try again.")
    })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 bg-nula-paper p-6 text-center text-nula-ink">
      <div className="flex items-center gap-2.5">
        <Logo className="size-9" />
        <span className="text-lg font-semibold tracking-tight">Nula CRM</span>
      </div>
      {error ? (
        <div className="flex flex-col items-center gap-3">
          <p className="text-sm text-nula-ink/70">{error}</p>
          <Link href={APP_ROUTES.pricing} className="text-sm font-medium text-nula-violet hover:underline">
            View plans
          </Link>
        </div>
      ) : (
        <div className="flex items-center gap-2 text-sm text-nula-ink/60">
          <Loader2 className="size-4 animate-spin" />
          Opening your secure checkout…
        </div>
      )}
    </div>
  )
}
