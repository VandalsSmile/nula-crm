import "server-only"

import type { SiteSignals } from "@/lib/outreach/types"

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"

/**
 * Heuristic, dependency-free read of a prospect's website for outreach signals.
 * Deliberately conservative — these feed a transparent scorecard, not a hard
 * decision. Pure function so it's unit-testable.
 */
export function analyzeSite(html: string): SiteSignals {
  const h = html.toLowerCase()

  const hasClearCta =
    /\b(book now|book online|schedule|get a quote|request a quote|free (estimate|consultation|quote)|get started|contact us|call now|buy now|shop now|sign up|start free)\b/.test(
      h,
    ) || /<(a|button)[^>]*class=["'][^"']*(btn|button|cta)[^"']*["']/.test(h)

  const emailCapture =
    /type=["']email["']/.test(h) ||
    /\b(newsletter|subscribe|join our (list|email)|sign up for)\b/.test(h) ||
    /<input[^>]*name=["'][^"']*email[^"']*["']/.test(h)

  const adsEvidence =
    /googletagmanager\.com|gtag\(|google_conversion|googleadservices|\bfbq\(|connect\.facebook\.net|snap\.sc|tiktok.*pixel|utm_(source|medium|campaign)/.test(
      h,
    )

  const reviews =
    /aggregaterating|"reviewrating"|\b(\d(\.\d)?)\s*stars?\b|\b(google|customer|client)\s+reviews?\b|trustpilot|yelp\.com/.test(
      h,
    )

  const blog = /\/blog\b|\/articles?\b|\/insights\b|<article\b|"blogposting"/.test(h)

  const multiLocation =
    /\/locations\b|our locations|multiple locations|\b(\d+)\s+locations\b/.test(h) ||
    (h.match(/<address\b/g)?.length ?? 0) > 1

  return { hasClearCta, emailCapture, adsEvidence, reviews, blog, multiLocation }
}

function normalizeUrl(input: string): string | null {
  const raw = input.trim()
  if (!raw) return null
  try {
    return new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`).toString()
  } catch {
    return null
  }
}

/** Fetch + analyze a prospect's site. Best-effort: returns null on any failure. */
export async function fetchSiteSignals(rawUrl: string, timeoutMs = 6000): Promise<SiteSignals | null> {
  const url = normalizeUrl(rawUrl)
  if (!url) return null
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "user-agent": UA, accept: "text/html" },
      redirect: "follow",
    })
    if (!res.ok) return null
    const html = await res.text()
    return analyzeSite(html)
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}
