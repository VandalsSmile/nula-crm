/** Base path for the authenticated CRM application */
export const APP_BASE = "/app"

export const APP_ROUTES = {
  dashboard: `${APP_BASE}/dashboard`,
  contacts: `${APP_BASE}/contacts`,
  deals: `${APP_BASE}/deals`,
  groups: `${APP_BASE}/groups`,
  tags: `${APP_BASE}/tags`,
  campaigns: `${APP_BASE}/campaigns`,
  inbox: `${APP_BASE}/inbox`,
  automations: `${APP_BASE}/automations`,
  ai: `${APP_BASE}/ai`,
  reports: `${APP_BASE}/reports`,
  help: `${APP_BASE}/help`,
  settings: `${APP_BASE}/settings`,
  login: "/login",
  signup: "/signup",
  onboarding: "/onboarding",
  faq: "/faq",
  pricing: "/pricing",
  terms: "/terms",
  privacy: "/privacy",
} as const

export const DEFAULT_APP_PATH = APP_ROUTES.dashboard

/** Build a CRM path under /app */
export function appPath(segment: string): string {
  const normalized = segment.startsWith("/") ? segment : `/${segment}`
  if (normalized === "/") return DEFAULT_APP_PATH
  return `${APP_BASE}${normalized}`
}

export function contactPath(id: string) {
  return `${APP_BASE}/contacts/${id}`
}

export function groupPath(id: string) {
  return `${APP_BASE}/groups/${id}`
}

/** Accept only same-origin relative paths to prevent open redirects. */
export function safeRedirectPath(
  value: string | null | undefined,
  fallback: string = DEFAULT_APP_PATH,
): string {
  if (!value) return fallback

  const trimmed = value.trim()
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) return fallback
  if (trimmed.includes("://")) return fallback

  // Legacy paths from before /app prefix
  const legacy = ["/dashboard", "/contacts", "/groups", "/tags", "/campaigns", "/inbox", "/automations", "/ai", "/reports", "/settings"]
  for (const prefix of legacy) {
    if (trimmed === prefix || trimmed.startsWith(`${prefix}/`) || trimmed.startsWith(`${prefix}?`)) {
      return appPath(trimmed)
    }
  }

  return trimmed
}

export const LAST_ROUTE_COOKIE = "nula-last-route"
