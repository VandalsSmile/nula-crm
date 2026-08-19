import { type NextRequest, NextResponse } from "next/server"

import { setOptOutByToken, unsubscribeUrl } from "@/lib/unsubscribe"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

/**
 * RFC 8058 one-click unsubscribe target. Mail providers (Gmail, Yahoo, etc.)
 * POST here with body `List-Unsubscribe=One-Click` when the recipient clicks the
 * native "Unsubscribe" button. No auth — the opaque token is the capability.
 * We opt the contact out immediately and return 200.
 */
export async function POST(_request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const ok = await setOptOutByToken(token, true)
  // Always 200 for a valid token; 404 only when the token is unknown.
  return NextResponse.json({ ok }, { status: ok ? 200 : 404 })
}

/**
 * A GET on the one-click URL (e.g. an older client following the link) is sent
 * to the human confirm page instead of opting out silently.
 */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  return NextResponse.redirect(unsubscribeUrl(token) || "/")
}
