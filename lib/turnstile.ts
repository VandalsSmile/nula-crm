import "server-only"

const SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify"

export type TurnstileResult = { ok: boolean; skipped: boolean; error?: string }

/**
 * Verifies a Cloudflare Turnstile token server-side. When TURNSTILE_SECRET_KEY
 * is not configured (e.g. local dev), verification is skipped and treated as
 * passing so the form still works.
 */
export async function verifyTurnstile(
  token: string | null | undefined,
  remoteIp?: string,
): Promise<TurnstileResult> {
  const secret = process.env.TURNSTILE_SECRET_KEY?.trim()
  if (!secret) return { ok: true, skipped: true }
  if (!token) return { ok: false, skipped: false, error: "missing_token" }

  try {
    const body = new URLSearchParams()
    body.set("secret", secret)
    body.set("response", token)
    if (remoteIp) body.set("remoteip", remoteIp)

    const response = await fetch(SITEVERIFY_URL, { method: "POST", body })
    const data = (await response.json()) as { success?: boolean; "error-codes"?: string[] }
    return {
      ok: Boolean(data.success),
      skipped: false,
      error: data.success ? undefined : (data["error-codes"] ?? []).join(","),
    }
  } catch (error) {
    return { ok: false, skipped: false, error: error instanceof Error ? error.message : "verify_failed" }
  }
}
