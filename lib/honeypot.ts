/**
 * Honeypot anti-bot field shared by the sign-up form and the auth route.
 *
 * A decoy input that's hidden from real users (off-screen, aria-hidden,
 * tabindex -1, autocomplete off). Humans never fill it; naive bots that fill
 * every field do — so a non-empty value means "reject as spam".
 *
 * The name is intentionally plausible (looks like a real field to a bot) rather
 * than obviously "honeypot".
 */
export const HONEYPOT_FIELD = "company_url"

export function isHoneypotTripped(value: unknown): boolean {
  return typeof value === "string" && value.trim() !== ""
}
