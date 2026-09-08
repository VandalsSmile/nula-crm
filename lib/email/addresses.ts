/**
 * Client-safe helpers for parsing user-entered recipient lists (Cc/Bcc).
 * Used by both the compose UI and the server send action.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Max recipients we accept per Cc/Bcc field, to avoid accidental blasts. */
export const MAX_RECIPIENTS = 25

export function isEmailish(value: string): boolean {
  return EMAIL_RE.test(value.trim())
}

/**
 * Parse a free-text list of addresses (comma/semicolon/whitespace separated)
 * into a deduped, lowercased list of valid-looking emails.
 */
export function parseEmailList(input: string | null | undefined): string[] {
  if (!input) return []
  const seen = new Set<string>()
  const out: string[] = []
  for (const raw of input.split(/[,;\s]+/)) {
    const email = raw.trim().toLowerCase()
    if (!email || !isEmailish(email) || seen.has(email)) continue
    seen.add(email)
    out.push(email)
    if (out.length >= MAX_RECIPIENTS) break
  }
  return out
}

/** Any non-empty tokens that don't look like valid emails (for UI warnings). */
export function invalidEmailTokens(input: string | null | undefined): string[] {
  if (!input) return []
  return input
    .split(/[,;\s]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !isEmailish(s))
}
