import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { getSessionCookie } from "better-auth/cookies"

import { APP_BASE } from "@/lib/routes"

const PROTECTED_PREFIXES = [
  `${APP_BASE}/dashboard`,
  `${APP_BASE}/contacts`,
  `${APP_BASE}/deals`,
  `${APP_BASE}/groups`,
  `${APP_BASE}/tags`,
  `${APP_BASE}/campaigns`,
  `${APP_BASE}/inbox`,
  `${APP_BASE}/automations`,
  `${APP_BASE}/ai`,
  `${APP_BASE}/reports`,
  `${APP_BASE}/help`,
  `${APP_BASE}/settings`,
]

const LEGACY_PREFIXES = [
  "/contacts",
  "/groups",
  "/tags",
  "/campaigns",
  "/inbox",
  "/automations",
  "/ai",
  "/reports",
  "/settings",
  "/clients",
]

function isProtectedPath(pathname: string) {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  )
}

function legacyRedirect(pathname: string, request: NextRequest) {
  for (const prefix of LEGACY_PREFIXES) {
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) {
      const url = request.nextUrl.clone()
      const suffix = pathname.slice(prefix.length)
      if (prefix === "/clients") {
        url.pathname = `${APP_BASE}/contacts${suffix.replace(/^\/clients/, "")}`
      } else {
        url.pathname = `${APP_BASE}${prefix}${suffix}`
      }
      return NextResponse.redirect(url)
    }
  }
  return null
}

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl
  const fullPath = pathname + search

  const legacy = legacyRedirect(pathname, request)
  if (legacy) return legacy

  const requestHeaders = new Headers(request.headers)
  requestHeaders.set("x-nula-path", fullPath)

  if (isProtectedPath(pathname) && !getSessionCookie(request)) {
    const loginUrl = new URL("/login", request.url)
    loginUrl.searchParams.set("callbackURL", fullPath)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next({ request: { headers: requestHeaders } })
}

export const config = {
  matcher: [
    "/app/:path*",
    "/dashboard/:path*",
    "/contacts/:path*",
    "/clients/:path*",
  "/groups/:path*",
  "/tags/:path*",
  "/campaigns/:path*",
    "/inbox/:path*",
    "/automations/:path*",
    "/ai/:path*",
    "/reports/:path*",
    "/settings/:path*",
  ],
}
