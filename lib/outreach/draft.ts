import "server-only"

import { chatCompletion } from "@/lib/ai/llm"
import { sanitizeEmailHtml } from "@/lib/email/sanitize"
import type {
  Assessment,
  OutreachApproach,
  OutreachDraft,
  OutreachProfileData,
} from "@/lib/outreach/types"

export type DraftArgs = {
  profile: OutreachProfileData
  approach: OutreachApproach
  assessment: Assessment
  target: { name: string; companyName: string }
  senderName: string
}

function firstName(name: string): string {
  return (name || "").trim().split(/\s+/)[0] ?? ""
}

function htmlParagraphs(lines: string[]): string {
  return lines
    .filter((l) => l.trim())
    .map((l) => `<p>${l.trim()}</p>`)
    .join("")
}

/** Deterministic fallback used when no AI provider is configured. */
export function templateDraft(args: DraftArgs): OutreachDraft {
  const { approach, assessment, target, profile } = args
  const hi = firstName(target.name) ? `Hi ${firstName(target.name)},` : "Hi there,"
  const observe = assessment.observe
    ? `I was looking at ${target.companyName || "your business"} and noticed ${assessment.observe}.`
    : approach.conversationStarter || "I wanted to reach out with a quick thought."
  const impact = assessment.impact ? assessment.impact : ""
  const pov = profile.valueProp || profile.positioning || approach.pointToMake || ""
  const proof = approach.proof ? approach.proof : ""
  const question = "Worth a quick 10 minutes to take a look together?"

  const lines = [hi, observe, impact, pov, proof, question].filter(Boolean)
  const subject = assessment.observe
    ? `Quick thought on ${target.companyName || "your business"}`
    : `${approach.name} — ${target.companyName || "your business"}`

  return {
    subject,
    html: htmlParagraphs(lines),
    approachId: approach.id,
    approachName: approach.name,
  }
}

/**
 * Draft a grounded cold email from the playbook + scorecard. Uses the shared LLM
 * layer (JSON) and falls back to a deterministic template when no key is set.
 * Hard rule: only use the supplied observation, impact, and proof — never invent
 * facts, metrics, or results.
 */
export async function generateOutreachDraft(args: DraftArgs): Promise<OutreachDraft> {
  const { profile, approach, assessment, target, senderName } = args

  const system = [
    "You are Nula's Outreach Advisor, writing a short B2B cold email for a salesperson.",
    profile.positioning ? `The sender's positioning: ${profile.positioning}` : "",
    `Use this angle: "${approach.name}". The point to make: ${approach.pointToMake}`,
    `Follow this formula in order: ${profile.formula.map((f) => `${f.label} (${f.guidance})`).join(" → ")}.`,
    "Rules: Keep it under 120 words. Be specific and human, not salesy. One clear, low-friction ask.",
    "CRITICAL: Use ONLY the supplied observation, impact, and proof. Never invent facts, metrics, results, or claims. If no proof is supplied, omit the proof step.",
    profile.doNotSend.length ? `Never do any of these: ${profile.doNotSend.join("; ")}.` : "",
    'Return JSON: { "subject": string, "html": string } where html is simple paragraphs (<p>…</p>), no inline styles.',
  ]
    .filter(Boolean)
    .join("\n")

  const user = JSON.stringify({
    sender: senderName,
    recipient: { name: target.name, company: target.companyName },
    observation: assessment.observe,
    impact: assessment.impact,
    proof: approach.proof || null,
    conversationStarter: approach.conversationStarter,
    valueProp: profile.valueProp || null,
  })

  const raw = await chatCompletion(
    [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    { json: true },
  )

  if (!raw) return templateDraft(args)

  try {
    const parsed = JSON.parse(raw) as { subject?: string; html?: string }
    const subject = (parsed.subject ?? "").trim()
    const html = sanitizeEmailHtml(parsed.html ?? "")
    if (!subject || !html) return templateDraft(args)
    return { subject, html, approachId: approach.id, approachName: approach.name }
  } catch {
    return templateDraft(args)
  }
}
