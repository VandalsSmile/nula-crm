"use client"

import { Suspense, useEffect } from "react"
import { usePathname, useSearchParams } from "next/navigation"

import { LAST_ROUTE_COOKIE } from "@/lib/safe-redirect-path"

const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30

function LastRouteTrackerInner() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (pathname === "/" || pathname === "/login") return

    const search = searchParams.toString()
    const path = search ? `${pathname}?${search}` : pathname
    document.cookie = `${LAST_ROUTE_COOKIE}=${encodeURIComponent(path)}; path=/; max-age=${COOKIE_MAX_AGE_SECONDS}; SameSite=Lax`
  }, [pathname, searchParams])

  return null
}

export function LastRouteTracker() {
  return (
    <Suspense fallback={null}>
      <LastRouteTrackerInner />
    </Suspense>
  )
}
