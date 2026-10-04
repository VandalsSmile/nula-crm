import "server-only"

import { chatCompletion } from "@/lib/ai/llm"
import { fetchBrand, normalizeUrl } from "@/lib/brand-fetch"
import type { OutreachApproach, OutreachProfileData } from "@/lib/outreach/types"

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"

function slug(s: string): string {
  return (
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 40) || "item"
  )
}

function stripHtml(html: string): string {
  return html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim()
}

async function fetchText(url: string, max = 6000): Promise<string> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 6000)
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "user-agent": UA, accept: "text/html" },
      redirect: "follow",
    })
    if (!res.ok) return ""
    return stripHtml(await res.text()).slice(0, max)
  } catch {
    return ""
  } finally {
    clearTimeout(timer)
  }
}

export type ProfileDraftResult = Partial<OutreachProfileData> & { name?: string }

/**
 * Pre-fill positioning/value prop/offerings from the account's own website.
 * Always returns at least a suggested name from the site; richer fields require
 * an AI provider.
 */
export async function profileFromWebsite(rawUrl: string): Promise<ProfileDraftResult> {
  let url: string
  try {
    url = normalizeUrl(rawUrl)
  } catch {
    throw new Error("Enter a valid website URL")
  }

  let name: string | undefined
  try {
    const brand = await fetchBrand(url, async () => "")
    if (brand.suggestedName?.trim()) name = `${brand.suggestedName.trim()} playbook`
  } catch {
    // ignore — name is best-effort
  }

  const text = await fetchText(url)
  if (!text) return name ? { name } : {}

  const raw = await chatCompletion(
    [
      {
        role: "system",
        content:
          "You are helping a business describe how they sell. From their website text, infer their core positioning (what they really sell, not a service list), a one-line value proposition, and a list of their offerings. Be concise and specific. Return JSON: { \"positioning\": string, \"valueProp\": string, \"offerings\": string[] }.",
      },
      { role: "user", content: text },
    ],
    { json: true },
  )
  if (!raw) return name ? { name } : {}
  try {
    const p = JSON.parse(raw) as { positioning?: string; valueProp?: string; offerings?: string[] }
    return {
      name,
      positioning: typeof p.positioning === "string" ? p.positioning.trim() : undefined,
      valueProp: typeof p.valueProp === "string" ? p.valueProp.trim() : undefined,
      offerings: Array.isArray(p.offerings) ? p.offerings.map(String).filter(Boolean).slice(0, 20) : undefined,
    }
  } catch {
    return name ? { name } : {}
  }
}

/**
 * Extract a draft playbook from a pasted guide (like a Sales/BD cold-outreach
 * doc). Requires an AI provider; returns {} when none is configured.
 */
export async function profileFromText(text: string): Promise<ProfileDraftResult> {
  const input = text.trim().slice(0, 16000)
  if (!input) return {}

  const raw = await chatCompletion(
    [
      {
        role: "system",
        content:
          "Extract a sales cold-outreach playbook from the provided document. Return JSON with: positioning (string), valueProp (string), offerings (string[]), doNotSend (string[] of things never to send), and approaches (array of { name, useWhen, pointToMake, conversationStarter }). Keep each field concise and faithful to the document. If a field isn't present, use an empty string or array.",
      },
      { role: "user", content: input },
    ],
    { json: true },
  )
  if (!raw) return {}

  try {
    const p = JSON.parse(raw) as {
      positioning?: string
      valueProp?: string
      offerings?: string[]
      doNotSend?: string[]
      approaches?: { name?: string; useWhen?: string; pointToMake?: string; conversationStarter?: string }[]
    }
    const approaches: OutreachApproach[] = Array.isArray(p.approaches)
      ? p.approaches
          .filter((a) => a?.name?.trim())
          .slice(0, 12)
          .map((a) => ({
            id: slug(a.name!),
            name: a.name!.trim(),
            useWhen: (a.useWhen ?? "").trim(),
            pointToMake: (a.pointToMake ?? "").trim(),
            conversationStarter: (a.conversationStarter ?? "").trim(),
            dontUseWhen: "",
            audiences: ["sales", "bd"],
            proof: "",
          }))
      : []

    return {
      positioning: typeof p.positioning === "string" ? p.positioning.trim() : undefined,
      valueProp: typeof p.valueProp === "string" ? p.valueProp.trim() : undefined,
      offerings: Array.isArray(p.offerings) ? p.offerings.map(String).filter(Boolean).slice(0, 20) : undefined,
      doNotSend: Array.isArray(p.doNotSend) ? p.doNotSend.map(String).filter(Boolean).slice(0, 20) : undefined,
      approaches: approaches.length ? approaches : undefined,
    }
  } catch {
    return {}
  }
}
