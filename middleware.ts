import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { getSessionCookie } from "better-auth/cookies"

const PROTECTED_PREFIXES = ["/dashboard", "/clients", "/settings"]

function isProtectedPath(pathname: string) {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  )
}

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl
  const fullPath = pathname + search

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
  matcher: ["/dashboard/:path*", "/clients/:path*", "/settings/:path*"],
}
