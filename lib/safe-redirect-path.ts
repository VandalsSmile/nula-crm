const DEFAULT_PATH = "/dashboard"

/** Accept only same-origin relative paths to prevent open redirects. */
export function safeRedirectPath(
  value: string | null | undefined,
  fallback: string = DEFAULT_PATH,
): string {
  if (!value) return fallback

  const trimmed = value.trim()
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) return fallback
  if (trimmed.includes("://")) return fallback

  return trimmed
}

export const LAST_ROUTE_COOKIE = "nula-last-route"
