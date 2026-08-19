"use server"

import { setOptOutByToken } from "@/lib/unsubscribe"

/**
 * Public opt-out/opt-in by unsubscribe token (no auth — the opaque token is the
 * capability). Used by the /unsubscribe/[token] page's confirm buttons.
 */
export async function submitUnsubscribe(token: string): Promise<{ ok: boolean }> {
  const ok = await setOptOutByToken(token, true)
  return { ok }
}

export async function resubscribe(token: string): Promise<{ ok: boolean }> {
  const ok = await setOptOutByToken(token, false)
  return { ok }
}
