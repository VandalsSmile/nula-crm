import "server-only"
import { Vibrant } from "node-vibrant/node"

export type BrandResult = {
  /** Public URL of the best logo found (already persisted to Blob), or null. */
  logoUrl: string | null
  /** Distinct brand color candidates as hex strings, most prominent first. */
  colors: string[]
  /** Best single accent color (hex), or null if none could be derived. */
  accentColor: string | null
  /** Suggested client name derived from the site's <title> / og:site_name. */
  suggestedName: string | null
  /** The normalized site URL that was fetched. */
  siteUrl: string
  /** Contact email found on the site (mailto, schema.org, etc.), or null. */
  email: string | null
  /** Phone number found on the site (tel links, schema.org, etc.), or null. */
  phone: string | null
  /** City and state formatted for the client profile location field, or null. */
  location: string | null
}

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"

/** Normalize a user-entered URL into an absolute https URL. */
export function normalizeUrl(input: string): string {
  let url = input.trim()
  if (!url) throw new Error("A URL is required")
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`
  // Throws if invalid.
  const u = new URL(url)
  return u.toString()
}

/** Fetch with a timeout so a slow site can't hang the request. */
async function fetchWithTimeout(url: string, init: RequestInit = {}, ms = 8000): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), ms)
  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
      headers: { "user-agent": UA, ...(init.headers ?? {}) },
      redirect: "follow",
    })
  } finally {
    clearTimeout(timer)
  }
}

/** Pull a single attribute value out of an HTML tag string. */
function attr(tag: string, name: string): string | null {
  const m = tag.match(new RegExp(`${name}\\s*=\\s*["']([^"']+)["']`, "i"))
  return m ? m[1] : null
}

/** Resolve a possibly-relative URL against the page base. */
function resolve(href: string, base: string): string | null {
  try {
    return new URL(href, base).toString()
  } catch {
    return null
  }
}

/** Collect logo candidate URLs from the page HTML, in priority order. */
function logoCandidates(html: string, base: string): string[] {
  const out: string[] = []
  const push = (href: string | null) => {
    if (!href) return
    const abs = resolve(href, base)
    if (abs && !out.includes(abs)) out.push(abs)
  }

  const linkTags = html.match(/<link\b[^>]*>/gi) ?? []
  // apple-touch-icon first (usually the largest, cleanest mark)
  for (const tag of linkTags) {
    const rel = attr(tag, "rel")?.toLowerCase() ?? ""
    if (rel.includes("apple-touch-icon")) push(attr(tag, "href"))
  }
  // og:image / twitter:image
  const metaTags = html.match(/<meta\b[^>]*>/gi) ?? []
  for (const tag of metaTags) {
    const key = (attr(tag, "property") ?? attr(tag, "name"))?.toLowerCase() ?? ""
    if (key === "og:image" || key === "og:image:url" || key === "twitter:image") {
      push(attr(tag, "content"))
    }
  }
  // any rel that contains "icon" (favicon, mask-icon, etc.)
  for (const tag of linkTags) {
    const rel = attr(tag, "rel")?.toLowerCase() ?? ""
    if (rel.includes("icon")) push(attr(tag, "href"))
  }
  // Google favicon service as a last resort (returns a PNG vibrant can read).
  try {
    const host = new URL(base).host
    out.push(`https://www.google.com/s2/favicons?domain=${host}&sz=128`)
  } catch {
    // ignore
  }
  return out
}

/** Read theme-color meta as an extra color candidate. */
function themeColor(html: string): string | null {
  const metaTags = html.match(/<meta\b[^>]*>/gi) ?? []
  for (const tag of metaTags) {
    if ((attr(tag, "name") ?? "").toLowerCase() === "theme-color") {
      const c = attr(tag, "content")
      if (c && /^#?[0-9a-f]{3,8}$/i.test(c.trim())) {
        return c.trim().startsWith("#") ? c.trim() : `#${c.trim()}`
      }
    }
  }
  return null
}

const JUNK_EMAIL_LOCAL = /^(noreply|no-reply|donotreply|wordpress|wixpress|sentry|mailer-daemon|postmaster|your@email|email@example)/i

function isPlausibleEmail(email: string): boolean {
  const trimmed = email.trim().toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return false
  const local = trimmed.split("@")[0] ?? ""
  return !JUNK_EMAIL_LOCAL.test(local)
}

function isPlausiblePhone(phone: string): boolean {
  const digits = phone.replace(/\D/g, "")
  return digits.length >= 10 && digits.length <= 15
}

/** Collect email addresses from mailto links, schema.org, and microdata. */
function contactEmails(html: string): string[] {
  const out: string[] = []
  const push = (raw: string | null) => {
    if (!raw) return
    const email = decodeURIComponent(raw).trim().toLowerCase()
    if (isPlausibleEmail(email) && !out.includes(email)) out.push(email)
  }

  const mailto = html.matchAll(/href\s*=\s*["']mailto:([^"'?#\s]+)/gi)
  for (const m of mailto) push(m[1] ?? null)

  for (const tag of html.match(/<[^>]*itemprop\s*=\s*["']email["'][^>]*>/gi) ?? []) {
    push(attr(tag, "content") ?? attr(tag, "href")?.replace(/^mailto:/i, "") ?? null)
    const inner = tag.match(/>([^<]+)</)
    if (inner?.[1]) push(inner[1])
  }

  for (const block of jsonLdBlocks(html)) walkJsonLd(block, out, [])

  return out
}

/** Collect phone numbers from tel links, schema.org, and microdata. */
function contactPhones(html: string): string[] {
  const out: string[] = []
  const push = (raw: string | null) => {
    if (!raw) return
    const phone = decodeURIComponent(raw).replace(/[^\d+().\-\s]/g, "").trim()
    if (isPlausiblePhone(phone) && !out.includes(phone)) out.push(phone)
  }

  const tel = html.matchAll(/href\s*=\s*["']tel:([^"']+)/gi)
  for (const m of tel) push(m[1] ?? null)

  for (const tag of html.match(/<[^>]*itemprop\s*=\s*["']telephone["'][^>]*>/gi) ?? []) {
    push(attr(tag, "content") ?? attr(tag, "href")?.replace(/^tel:/i, "") ?? null)
    const inner = tag.match(/>([^<]+)</)
    if (inner?.[1]) push(inner[1])
  }

  for (const block of jsonLdBlocks(html)) walkJsonLd(block, [], out)

  return out
}

function jsonLdBlocks(html: string): unknown[] {
  const blocks: unknown[] = []
  const scripts =
    html.match(/<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi) ??
    []
  for (const script of scripts) {
    const body = script.match(/>([\s\S]*?)<\/script>/i)?.[1]?.trim()
    if (!body) continue
    try {
      blocks.push(JSON.parse(body))
    } catch {
      // ignore malformed JSON-LD
    }
  }
  return blocks
}

function walkJsonLd(node: unknown, emails: string[], phones: string[]): void {
  if (!node || typeof node !== "object") return
  if (Array.isArray(node)) {
    for (const item of node) walkJsonLd(item, emails, phones)
    return
  }
  const obj = node as Record<string, unknown>
  if (typeof obj.email === "string") {
    const email = obj.email.trim().toLowerCase()
    if (isPlausibleEmail(email) && !emails.includes(email)) emails.push(email)
  }
  if (typeof obj.telephone === "string") {
    const phone = obj.telephone.trim()
    if (isPlausiblePhone(phone) && !phones.includes(phone)) phones.push(phone)
  }
  for (const value of Object.values(obj)) walkJsonLd(value, emails, phones)
}

type LocationParts = { city: string; state: string }

const US_STATE_ABBREV: Record<string, string> = {
  alabama: "AL",
  alaska: "AK",
  arizona: "AZ",
  arkansas: "AR",
  california: "CA",
  colorado: "CO",
  connecticut: "CT",
  delaware: "DE",
  florida: "FL",
  georgia: "GA",
  hawaii: "HI",
  idaho: "ID",
  illinois: "IL",
  indiana: "IN",
  iowa: "IA",
  kansas: "KS",
  kentucky: "KY",
  louisiana: "LA",
  maine: "ME",
  maryland: "MD",
  massachusetts: "MA",
  michigan: "MI",
  minnesota: "MN",
  mississippi: "MS",
  missouri: "MO",
  montana: "MT",
  nebraska: "NE",
  nevada: "NV",
  "new hampshire": "NH",
  "new jersey": "NJ",
  "new mexico": "NM",
  "new york": "NY",
  "north carolina": "NC",
  "north dakota": "ND",
  ohio: "OH",
  oklahoma: "OK",
  oregon: "OR",
  pennsylvania: "PA",
  "rhode island": "RI",
  "south carolina": "SC",
  "south dakota": "SD",
  tennessee: "TN",
  texas: "TX",
  utah: "UT",
  vermont: "VT",
  virginia: "VA",
  washington: "WA",
  "west virginia": "WV",
  wisconsin: "WI",
  wyoming: "WY",
  "district of columbia": "DC",
}

function normalizeState(state: string): string {
  const trimmed = state.trim()
  if (/^[A-Za-z]{2}$/.test(trimmed)) return trimmed.toUpperCase()
  return US_STATE_ABBREV[trimmed.toLowerCase()] ?? trimmed
}

function formatCityState(city: string | null | undefined, state: string | null | undefined): string | null {
  const c = city?.trim()
  const s = state?.trim()
  if (!c && !s) return null
  if (c && s) return `${c}, ${normalizeState(s)}`
  return c ?? (s ? normalizeState(s) : null)
}

function pushLocation(out: LocationParts[], city: string | null | undefined, state: string | null | undefined) {
  const formatted = formatCityState(city, state)
  if (!formatted) return
  const parts = formatted.split(",").map((p) => p.trim())
  const candidate = { city: parts[0] ?? "", state: parts[1] ?? "" }
  if (!candidate.city) return
  if (!out.some((l) => l.city === candidate.city && l.state === candidate.state)) {
    out.push(candidate)
  }
}

function parseAddressString(raw: string): { city: string; state: string } | null {
  const text = raw.replace(/\s+/g, " ").trim()
  // "123 Main St, Chicago, IL 60601" or "Chicago, Illinois"
  const match = text.match(/,\s*([^,]+?),\s*([A-Za-z]{2,})\b(?:\s+\d{5}(?:-\d{4})?)?\s*$/)
  if (match) {
    return { city: match[1]!.trim(), state: match[2]!.trim() }
  }
  const simple = text.match(/^([^,]+),\s*([A-Za-z]{2,}(?:\s+[A-Za-z]{2,})?)\s*$/)
  if (simple) {
    return { city: simple[1]!.trim(), state: simple[2]!.trim() }
  }
  return null
}

function walkJsonLdLocation(node: unknown, locations: LocationParts[]): void {
  if (!node || typeof node !== "object") return
  if (Array.isArray(node)) {
    for (const item of node) walkJsonLdLocation(item, locations)
    return
  }
  const obj = node as Record<string, unknown>
  const type = typeof obj["@type"] === "string" ? obj["@type"].toLowerCase() : ""

  if (type.includes("postaladdress") || obj.addressLocality || obj.addressRegion) {
    pushLocation(
      locations,
      typeof obj.addressLocality === "string" ? obj.addressLocality : null,
      typeof obj.addressRegion === "string" ? obj.addressRegion : null,
    )
  }

  if (obj.address) {
    if (typeof obj.address === "string") {
      const parsed = parseAddressString(obj.address)
      if (parsed) pushLocation(locations, parsed.city, parsed.state)
    } else {
      walkJsonLdLocation(obj.address, locations)
    }
  }

  if (typeof obj.location === "object" && obj.location) {
    walkJsonLdLocation(obj.location, locations)
  }

  for (const value of Object.values(obj)) {
    if (value !== obj.address && value !== obj.location) walkJsonLdLocation(value, locations)
  }
}

/** Collect city/state from schema.org JSON-LD and microdata. */
function contactLocations(html: string): string[] {
  const parts: LocationParts[] = []

  for (const block of jsonLdBlocks(html)) walkJsonLdLocation(block, parts)

  const localityTags = html.match(/<[^>]*itemprop\s*=\s*["']addressLocality["'][^>]*>/gi) ?? []
  for (const tag of localityTags) {
    const city = attr(tag, "content") ?? tag.match(/>([^<]+)</)?.[1]?.trim()
    if (!city) continue
    const regionTag = html.match(
      new RegExp(`itemprop\\s*=\\s*["']addressRegion["'][^>]*>\\s*([^<]+)`, "i"),
    )
    const state = regionTag?.[1]?.trim() ?? null
    pushLocation(parts, city, state)
  }

  return parts.map((p) => formatCityState(p.city, p.state)).filter((v): v is string => Boolean(v))
}

/** Prefer a same-host canonical or og:url over the raw fetch URL. */
function preferredSiteUrl(html: string, fetchedUrl: string): string {
  const push = (href: string | null): string | null => {
    if (!href) return null
    return resolve(href, fetchedUrl)
  }

  let candidate: string | null = null
  for (const tag of html.match(/<link\b[^>]*>/gi) ?? []) {
    if ((attr(tag, "rel") ?? "").toLowerCase() === "canonical") {
      candidate = push(attr(tag, "href"))
      if (candidate) break
    }
  }
  if (!candidate) {
    for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
      const key = (attr(tag, "property") ?? attr(tag, "name"))?.toLowerCase() ?? ""
      if (key === "og:url") {
        candidate = push(attr(tag, "content"))
        if (candidate) break
      }
    }
  }
  if (!candidate) return fetchedUrl
  try {
    const canonical = new URL(candidate)
    const fetched = new URL(fetchedUrl)
    if (canonical.host === fetched.host) return canonical.toString()
  } catch {
    // ignore invalid URLs
  }
  return fetchedUrl
}

/** Derive a friendly site name from og:site_name or <title>. */
function siteName(html: string): string | null {
  const metaTags = html.match(/<meta\b[^>]*>/gi) ?? []
  for (const tag of metaTags) {
    if ((attr(tag, "property") ?? "").toLowerCase() === "og:site_name") {
      const c = attr(tag, "content")?.trim()
      if (c) return c
    }
  }
  const t = html.match(/<title[^>]*>([^<]+)<\/title>/i)
  if (t) {
    // Trim common " | Tagline" / " - Tagline" suffixes.
    return t[1].trim().split(/\s[|\-–—]\s/)[0].trim() || null
  }
  return null
}

/** Download an image and return its bytes, or null on any failure. */
async function downloadImage(url: string): Promise<{ buffer: Buffer; contentType: string } | null> {
  try {
    const res = await fetchWithTimeout(url, {}, 8000)
    if (!res.ok) return null
    const contentType = res.headers.get("content-type") ?? ""
    if (!contentType.startsWith("image/")) return null
    // Skip SVG — the raster palette extractor can't decode it.
    if (contentType.includes("svg")) return { buffer: Buffer.from(await res.arrayBuffer()), contentType }
    const buffer = Buffer.from(await res.arrayBuffer())
    if (buffer.byteLength === 0) return null
    return { buffer, contentType }
  } catch {
    return null
  }
}

/** Extract a color palette (hex) from raster image bytes. */
async function paletteFromImage(buffer: Buffer): Promise<string[]> {
  try {
    const palette = await Vibrant.from(buffer).getPalette()
    return Object.values(palette)
      .filter((s): s is NonNullable<typeof s> => Boolean(s))
      .sort((a, b) => b.population - a.population)
      .map((s) => s.hex)
  } catch {
    return []
  }
}

/**
 * Fetch a website and extract its logo + brand colors.
 * Best-effort: any individual step can fail without throwing.
 */
export async function fetchBrand(
  rawUrl: string,
  persistLogo: (buffer: Buffer, contentType: string) => Promise<string>,
): Promise<BrandResult> {
  const siteUrl = normalizeUrl(rawUrl)

  let html = ""
  try {
    const res = await fetchWithTimeout(siteUrl, { headers: { accept: "text/html" } }, 8000)
    html = await res.text()
  } catch {
    throw new Error("Could not reach that URL")
  }

  const candidates = logoCandidates(html, siteUrl)
  const colors: string[] = []
  const theme = themeColor(html)
  if (theme) colors.push(theme.toLowerCase())

  // Walk candidates until one downloads as a usable raster we can persist.
  let logoUrl: string | null = null
  for (const candidate of candidates) {
    const img = await downloadImage(candidate)
    if (!img) continue

    // Persist the first good logo to Blob (even SVG, which we can serve).
    if (!logoUrl) {
      try {
        logoUrl = await persistLogo(img.buffer, img.contentType)
      } catch {
        // If persistence fails, keep the remote URL as a fallback.
        logoUrl = candidate
      }
    }

    // Only raster images yield a palette.
    if (!img.contentType.includes("svg")) {
      const pal = await paletteFromImage(img.buffer)
      for (const hex of pal) {
        const h = hex.toLowerCase()
        if (!colors.includes(h)) colors.push(h)
      }
    }
    if (logoUrl && colors.length >= 4) break
  }

  const emails = contactEmails(html)
  const phones = contactPhones(html)
  const locations = contactLocations(html)

  return {
    logoUrl,
    colors: colors.slice(0, 6),
    accentColor: colors[0] ?? null,
    suggestedName: siteName(html),
    siteUrl: preferredSiteUrl(html, siteUrl),
    email: emails[0] ?? null,
    phone: phones[0] ?? null,
    location: locations[0] ?? null,
  }
}
