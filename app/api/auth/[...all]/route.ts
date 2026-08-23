import { auth } from "@/lib/auth"
import { toNextJsHandler } from "better-auth/next-js"
import { HONEYPOT_FIELD, isHoneypotTripped } from "@/lib/honeypot"

const handlers = toNextJsHandler(auth.handler)

export const GET = handlers.GET

/**
 * Wrap the better-auth POST handler with a server-side honeypot check on
 * sign-up. We read a clone of the request (leaving the original body intact for
 * better-auth) and reject when the decoy field is filled — a bot signal.
 */
export async function POST(request: Request): Promise<Response> {
  if (request.url.includes("/sign-up")) {
    try {
      const body = (await request.clone().json()) as Record<string, unknown> | null
      if (body && isHoneypotTripped(body[HONEYPOT_FIELD])) {
        return Response.json({ message: "Sign-up could not be completed." }, { status: 400 })
      }
    } catch {
      // Not JSON / unreadable — let better-auth handle it normally.
    }
  }
  return handlers.POST(request)
}
