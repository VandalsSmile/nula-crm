import type { BusinessTypeId } from "@/lib/crm-defaults"
import { BUSINESS_TYPES } from "@/lib/crm-defaults"
import type { FormulaStep, OutreachApproach, OutreachProfileData, OutreachSignal } from "@/lib/outreach/types"

/** The default cold-outreach formula (OBSERVE → IMPACT → POV → PROOF → QUESTION). */
export const DEFAULT_FORMULA: FormulaStep[] = [
  { key: "observe", label: "Observe", guidance: "One specific, true thing you noticed about them." },
  { key: "impact", label: "Impact", guidance: "What that may be costing them (money, leads, customers)." },
  { key: "pov", label: "Point of view", guidance: "Your take on the real problem — not a service pitch." },
  { key: "proof", label: "Proof", guidance: "A relevant, verifiable result — only if you have one." },
  { key: "question", label: "Question", guidance: "A low-friction ask (e.g. worth 10 minutes to look?)." },
]

/** A generic, business-agnostic set of outreach angles most SMB sellers can use. */
const STARTER_APPROACHES: OutreachApproach[] = [
  {
    id: "quick-win",
    name: "A specific problem I can fix",
    useWhen: "You spotted a concrete, fixable gap in how they operate or market.",
    pointToMake: "Lead with the one problem you noticed — not a list of what you do.",
    conversationStarter:
      "I was looking at your business and noticed {observation}. Curious whether that's on your radar?",
    dontUseWhen: "The problem is vague or you can't point to something specific.",
    audiences: ["sales"],
    proof: "",
  },
  {
    id: "customer-economics",
    name: "What one customer is worth",
    useWhen: "A single new customer is worth significant money.",
    pointToMake: "Talk customer economics and ROI, not vanity metrics.",
    conversationStarter: "What's one really good new customer worth to your business?",
    dontUseWhen: "Low-ticket, high-volume businesses where unit economics are tiny.",
    audiences: ["sales", "bd"],
    proof: "",
  },
  {
    id: "money-leak",
    name: "Getting more from what you already spend",
    useWhen: "They're already investing in marketing/ops but the pieces are disconnected.",
    pointToMake: "They may not need more — they need to convert more of what they already pay for.",
    conversationStarter:
      "You're clearly already investing here. The thing I'd want to understand is how much of it actually turns into customers.",
    dontUseWhen: "They're barely doing anything yet — there's little to optimize.",
    audiences: ["sales", "bd"],
    proof: "",
  },
  {
    id: "system",
    name: "Make the pieces work together",
    useWhen: "Sophisticated target with multiple tools/vendors but no connected system.",
    pointToMake: "The problem isn't effort — it's fragmentation. Pieces vs. a system.",
    conversationStarter:
      "You're doing a lot already. The question I'd have is whether it's all working together toward the same goal.",
    dontUseWhen: "Small, simple operations where a 'system' pitch is overkill.",
    audiences: ["bd"],
    proof: "",
  },
  {
    id: "relevant-proof",
    name: "Relevant proof",
    useWhen: "You have a defensible, comparable result to point to.",
    pointToMake: "Earn trust with a specific, comparable outcome — then ask for the next step.",
    conversationStarter: "We recently helped {comparable} achieve {result} — happy to share how.",
    dontUseWhen: "You don't have a genuine, comparable result to cite.",
    audiences: ["sales", "bd"],
    proof: "",
  },
]

/** Generic qualifying signals that feed the scorecard. */
const STARTER_SIGNALS: OutreachSignal[] = [
  {
    id: "weak-website",
    label: "Website is a brochure (weak calls to action / no clear next step)",
    description: "Looks fine but isn't built to convert visitors into leads.",
    weight: 12,
    source: "site",
    approachId: "quick-win",
    approachWeight: 20,
  },
  {
    id: "running-ads",
    label: "Evidence of paid advertising",
    description: "Running Google/Meta ads — there's spend to make more efficient.",
    weight: 10,
    source: "site",
    approachId: "money-leak",
    approachWeight: 22,
  },
  {
    id: "high-ltv",
    label: "High-value customers or jobs",
    description: "A single new customer is worth a lot — ROI math is compelling.",
    weight: 16,
    source: "self",
    approachId: "customer-economics",
    approachWeight: 25,
  },
  {
    id: "multi-channel",
    label: "Multiple channels / vendors, no connected system",
    description: "Lots of activity but fragmented and unmeasured.",
    weight: 12,
    source: "manual",
    approachId: "system",
    approachWeight: 25,
  },
  {
    id: "decision-maker",
    label: "Reached a decision maker",
    description: "Owner or senior buyer with authority to say yes.",
    weight: 10,
    source: "enrichment",
    approachId: "",
    approachWeight: 0,
  },
  {
    id: "right-size",
    label: "Right size to afford us",
    description: "Enough scale/revenue to be a viable customer.",
    weight: 8,
    source: "enrichment",
    approachId: "",
    approachWeight: 0,
  },
  {
    id: "barely-markets",
    label: "Barely markets at all (disqualifier)",
    description: "No real system to optimize — usually a weaker fit for outreach.",
    weight: -10,
    source: "manual",
    approachId: "",
    approachWeight: 0,
  },
]

const STARTER_DO_NOT_SEND: string[] = [
  "A generic list of every service you offer",
  'Unverifiable claims ("we\'ll 10x your revenue", "guaranteed results")',
  '"We help businesses like yours grow" and other filler',
  "Anything that insults the prospect's current website or work",
]

function labelForBusinessType(businessType: BusinessTypeId): string {
  return BUSINESS_TYPES.find((b) => b.id === businessType)?.label ?? "Your customers"
}

/**
 * Build a sensible starter profile for a workspace from its business type. The
 * account still edits positioning/offerings — those are theirs — but they get a
 * working set of angles, signals, a vertical, and a formula on day one.
 */
export function starterProfile(businessType: BusinessTypeId): { name: string; data: OutreachProfileData } {
  const vertical = {
    id: "primary",
    label: labelForBusinessType(businessType),
    primaryProblem: "Acquisition → conversion → retention",
    strongQuestions: [
      "How many of the leads you already get actually become customers?",
      "What's one great new customer worth to you?",
    ],
    preferredApproachIds: ["quick-win", "customer-economics", "money-leak"],
  }

  return {
    name: "Outreach playbook",
    data: {
      positioning: "",
      valueProp: "",
      offerings: [],
      verticals: [vertical],
      signals: STARTER_SIGNALS,
      approaches: STARTER_APPROACHES,
      formula: DEFAULT_FORMULA,
      doNotSend: STARTER_DO_NOT_SEND,
    },
  }
}
