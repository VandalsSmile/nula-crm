# Outreach Advisor — Design

A new capability in Nula's **upgraded intelligence package** (the B2B Intelligence
add‑on — not base Nula) that helps Sales/BD users write **cold outreach emails
grounded in a scorecard of the target**. The user first "educates"
Nula on what a good target looks like for *their* business — offerings, verticals,
ideal-customer criteria, the angles that work, typical conversions — and Nula then:

1. **Scores** any contact/company against that profile (a transparent scorecard),
2. **Recommends the right angle** for that specific target, and
3. **Drafts a personalized cold email** using the angle + the observed signals, in
   the existing rich‑text composer, ready to edit and send.

The uploaded *VS Marketing Sales & BD Cold Outreach Guide* is treated as **one
concrete instance** of a universal, account‑customizable schema. Nothing about VS,
digital marketing, or North Alabama is hard‑coded; it's just example data for the
generic model below.

---

## 1. Principles

- **Customizable to any account.** The guide's structure (positioning → research
  signals → angles → decision rules → vertical tailoring → formula → do‑not‑send)
  generalizes to any business. We model that structure; each workspace fills it in.
- **Grounded, not generic.** The product enforces the guide's own golden rule:
  *"I'm contacting this company because I noticed ___, and I believe it could be
  costing them ___."* No email is draftable until those blanks are filled from real
  signals. Never fabricate proof, metrics, or claims.
- **Transparent scoring.** Reuse the spirit of `computeFitScore` / `calculateLeadScore`:
  a small, explainable, weighted model the user can see and tune — not a black box.
- **Reuse what exists.** Build on enrichment (`NormalizedEnrichment`, Fit Score,
  feedback signals), `lib/brand-fetch` (free site signals), the shared LLM layer
  (`chatCompletion`, JSON mode + deterministic fallback), signatures, the rich
  composer, target lists (outreach status), and the module/entitlement system.
- **Works without AI keys.** Every AI step has a deterministic template fallback so
  the feature degrades gracefully, matching the rest of Nula.
- **Sales vs BD aware.** The same profile drives two emphases (quick, tangible
  revenue problems vs. structural/strategic problems), per the guide.

---

## 2. The core idea: the guide is an instance of a schema

The VS guide decomposes cleanly into reusable parts. Every workspace gets the same
parts, filled with their own content:

| Guide section | Generic model element |
| --- | --- |
| "Core VS Positioning" / value prop | `profile.positioning`, `profile.valueProp` |
| "Research Before You Reach Out" checklist | `profile.scoringSignals[]` (what to look for) |
| Approaches #1–#5 (Website, Money Leak, Customer Economics, Local, System) | `profile.approaches[]` |
| Each approach's **USE WHEN / ESPECIALLY GOOD FOR / THE POINT / STARTER / DON'T USE** | fields on an `Approach` |
| "Quick Decision Guide" (signal → approach) | derived automatically from signal→approach weights |
| "Sales vs BD" | `approach.audience` + `profile.salesVsBd` emphasis |
| "Tailor by Vertical" | `profile.verticals[]` with per‑vertical problem + preferred approaches |
| "The Rule for Every Cold Email" | hard gate in the drafting flow (observe + impact required) |
| "What NOT to Send" | `profile.doNotSend[]` → negative constraints in the prompt |
| "The VS Outreach Formula" (OBSERVE→IMPACT→POV→PROOF→QUESTION) | `profile.formula` (ordered, editable steps) |

So the feature is: **(A) a profile editor** to capture this, **(B) a scorecard
engine** that reads a target and the profile, and **(C) an email drafter** that turns
the scorecard into a message.

---

## 3. The three pillars (+ learning loop)

### A. Outreach Profile — "educate the tool"
A per‑workspace, versioned record describing who you sell to and how. Created three
ways (any combination):
- **Guided wizard** — a few screens (positioning, offerings, verticals, ICP, angles).
- **AI‑assisted from your website** — reuse `fetchBrand(url)` to pre‑fill positioning,
  offerings, and verticals from the account's own site, then the user edits.
- **Import a playbook** — paste an existing doc (exactly like the VS PDF) and the LLM
  extracts a draft profile (positioning, signals, approaches, verticals) for review.
- **Industry starters** — seed a reasonable default profile from the workspace's
  `businessType` (`BUSINESS_TYPES`), so there's a useful starting point on day one.

### B. Target Scorecard — "assess the target"
For a given contact/company, evaluate each `scoringSignal` against available data,
produce a **fit score (0–100) + label**, the **matched signals**, the
**recommended approach(es)**, and the **OBSERVE / IMPACT** fill‑ins. Cached as a
`target_assessment` and shown as a compact "scorecard" card.

Signal evaluation pulls from, in priority order:
1. **Self‑reported CRM fields** (contact/company: industry, website, size, revenue,
   notes, tags).
2. **Enrichment** (`NormalizedEnrichment`) when the B2B Intelligence module is on
   (growthSignals, employeeCount, revenueEstimate, seniority/decisionMaker, techStack).
3. **Free site signals** via `lib/brand-fetch` on the company website (has clear CTA,
   email capture, evidence of ads, reviews, blog activity, multiple locations) — the
   **credit‑free path within the module**, so a subscriber gets useful scorecards even
   before (or without) spending enrichment credits.
4. **Manual research checklist** — the rep can tick/counter signals during the ~5–10
   min research step the guide prescribes; manual input always wins.

Each signal carries a `weight` and optionally an `approachHint` (which angle it
argues for). The score is the normalized sum of matched weights (same transparent
style as `computeFitScore`). The recommended approach is the one with the highest
summed `approachHint` weight among matched signals, tie‑broken by the active
audience (Sales vs BD) emphasis and vertical preference.

### C. Email Drafter — "write the email"
Given the scorecard + chosen approach + the account's `formula` + the sender's
signature, draft a cold email in the rich composer. The drafter:
- **Enforces the golden rule**: requires non‑empty OBSERVE and IMPACT before it will
  generate; if missing, it prompts the rep to add a specific observation.
- **Follows the formula** (OBSERVE → IMPACT → POV → PROOF → QUESTION by default,
  editable) and the approach's `pointToMake` + `conversationStarter` as guidance.
- **Applies do‑not‑send constraints** (no "we 10X leads", no generic "we help
  businesses like yours", no insulting the site, etc.).
- **Only uses provided proof** — a case study/result is included *only* if the user
  has one attached to the approach/vertical; otherwise the PROOF step is skipped
  rather than invented.
- Produces subject + HTML body; opens in the existing composer (CC/BCC, signature,
  ⌘/Ctrl+Enter send). Deterministic fallback assembles the email from the approach's
  starter template + the observe/impact when no AI key is present.

### D. Learning loop
Outcomes already exist in Nula and feed back in:
- **Target‑list outreach status** (`new → contacted → responded → meeting → won`) and
  **enrichment feedback** (`good_prospect`, `bad_prospect`, `became_customer`).
- These aggregate per signal/approach/vertical into simple **win‑rate stats**
  ("Money Leak converts best for Trades") shown in the profile editor, and gently
  nudge default weights/recommendations over time. v1 just surfaces the stats; auto‑
  tuning is a later phase.

---

## 4. Data model

New tables (workspace‑scoped via `userId`, consistent with the codebase):

```
outreach_profiles
  id            text pk
  userId        text            -- workspace id
  name          text            -- e.g. "VS Sales & BD Playbook"
  isActive      boolean         -- one active profile per workspace
  positioning   text            -- core positioning / "what we really sell"
  valueProp     text
  offerings     jsonb           -- string[] of services/products
  verticals     jsonb           -- Vertical[] (see below)
  icp           jsonb           -- firmographic criteria (min size, revenue, geos, titles)
  scoringSignals jsonb          -- ScoringSignal[]
  approaches    jsonb           -- Approach[]
  formula       jsonb           -- FormulaStep[] (ordered)
  doNotSend     jsonb           -- string[] of banned patterns/claims
  salesVsBd     jsonb           -- { sales: approachId[], bd: approachId[] } emphases
  createdAt     timestamp
  updatedAt     timestamp

target_assessments               -- cached scorecard per subject
  id                 text pk
  userId             text
  profileId          text
  subjectType        text        -- "contact" | "company"
  subjectId          text
  score              integer      -- 0..100
  label              text         -- Strong/Good/Fair/Weak (reuse fitScoreLabel)
  matchedSignals     jsonb        -- [{ signalId, value, source }]
  recommendedApproachId text
  observe            text         -- "I noticed ___"
  impact             text         -- "...costing them ___"
  rationale          text         -- short why-this-angle explanation
  audience           text         -- "sales" | "bd"
  createdAt          timestamp
```

Embedded shapes (TypeScript, stored as JSONB):

```ts
type ScoringSignal = {
  id: string
  label: string              // "Weak calls to action", "Running Google Ads"
  description?: string       // research hint
  weight: number             // contribution to fit (can be negative = disqualifier)
  source: "self" | "enrichment" | "site" | "manual"
  // optional machine detection for self/enrichment/site sources:
  detect?: { field: string; op: "present"|"absent"|"gte"|"lte"|"matches"; value?: string|number }
  approachHint?: { approachId: string; weight: number }  // which angle it argues for
  vertical?: string          // optional scoping
}

type Approach = {
  id: string
  name: string               // "Where Is the Money Leaking?"
  useWhen: string            // criteria prose
  goodFor: string[]          // vertical ids/labels
  pointToMake: string
  conversationStarter: string
  dontUseWhen?: string
  audience: ("sales"|"bd")[] // who should lean on it
  proof?: string             // optional case study/result to cite (only if provided)
}

type Vertical = {
  id: string
  label: string              // "Trades", "Professional services"
  primaryProblem: string     // "Lead → Estimate → Booked Job"
  strongQuestions: string[]
  preferredApproachIds: string[]
}

type FormulaStep = { key: string; label: string; guidance: string } // OBSERVE, IMPACT, ...
```

Reused, not rebuilt:
- **Outcomes** come from existing `contact_groups` outreach status (target lists) and
  `enrichment_feedback` — no new outcome table.
- **ICP → Fit** overlaps with `FitScoreConfig`; Outreach Advisor's `scoringSignals`
  is a superset. `computeFitScore` is refactored to accept the signal list so there's
  one scoring path (enrichment Fit Score becomes the firmographic subset).
- `workspace_settings.businessType` seeds the starter profile.

---

## 5. Where it lives (UX)

- **Settings → Outreach Advisor** — the profile editor (positioning, offerings,
  verticals, ICP, signals + weights, approaches, formula, do‑not‑send), plus the
  "build from website / import a playbook / use an industry starter" entry points and
  the win‑rate stats.
- **Contact & Company pages** — a "Draft outreach" button and a compact **Scorecard
  card** (fit label, matched signals, recommended angle, the OBSERVE/IMPACT line). The
  button opens the rich composer prefilled with the generated draft.
- **Target lists** — a natural home for Sales/BD. "Draft outreach" per member, and
  per‑member recommended angle shown in the list. (Target lists already track the
  outreach status this feature learns from.)
- **AI command bar** — new intents: *"draft a cold email to {contact}"* and
  *"who's the best angle for {contact}?"* routed through the same engine
  (`lib/ai/interpreter.ts` + `interpret-with-llm.ts`).
- **Campaigns** — stretch: generate an approach‑specific sequence for a target list
  segment.

---

## 6. Engine details

### 6.1 Scoring (`lib/outreach/scorecard.ts`)
`assessTarget(profile, subject, { enrichment?, siteSignals?, manual? }) → Assessment`
- Evaluate each `ScoringSignal.detect` against the merged data (self + enrichment +
  site + manual). Manual overrides machine detection.
- `score = clamp(round(base + Σ matchedWeights, normalized to 0..100))`; label via
  `fitScoreLabel`. Negative‑weight signals act as disqualifiers (the guide's
  "DON'T USE" / "move to a better prospect").
- `recommendedApproachId` = argmax over approaches of Σ `approachHint.weight` for
  matched signals, filtered by audience emphasis + subject vertical; expose the top
  2–3 as alternatives (angles can be combined, per the guide).
- Derive `observe`/`impact` from the highest‑weight matched signals (templated;
  AI‑polished when available).

### 6.2 Site signals (`lib/brand-fetch` extension)
Add light, free heuristics to `fetchBrand` output used only by the advisor:
has/weak CTA, email capture present, blog/content activity, evidence of ads
(ad‑pixel/utm hints), review presence, multiple locations. These map directly to the
guide's research checklist and power the module‑free path.

### 6.3 Drafting (`lib/outreach/draft.ts`)
`draftOutreachEmail(profile, approach, assessment, sender, { audience }) → { subject, html }`
- System prompt encodes: positioning/value prop, the chosen approach
  (`pointToMake`, `conversationStarter`), the `formula` order, `doNotSend`
  constraints, audience emphasis, and **"use only the supplied observation, impact,
  and proof — never invent facts, metrics, or results."**
- User message carries the assessment (observe/impact/matched signals), subject
  guidance, and the contact/company facts.
- JSON out `{ subject, html }`; sanitized via `sanitizeEmailHtml`; signature appended
  by the existing send path. Deterministic fallback = starter template with
  observe/impact slotted into the formula.

---

## 7. Packaging / gating

- **Outreach Advisor ships inside the upgraded intelligence package — the existing
  B2B Intelligence add‑on (`MODULE_IDS.b2bIntelligence`), not base Nula.** The whole
  capability (profile editor, scorecard, drafter, AI intents, target‑list angles) is
  gated. Every server action calls `requireModule(MODULE_IDS.b2bIntelligence)` and the
  UI entry points are hidden/locked when the add‑on is off, with the standard
  `MODULE_DISABLED_MESSAGE` upsell to **Settings → Plan** — identical to how Nula
  Intelligence enrichment is gated today.
- **Within the module, enrichment credits still meter the enrichment‑powered signals.**
  The scorecard's self‑reported and free **site signals** (`lib/brand-fetch`) and the
  manual research checklist do **not** consume enrichment credits; only pulling fresh
  `NormalizedEnrichment` does (via the existing credit metering). So an intelligence
  subscriber always gets the advisor, and enrichment credits remain the usage lever.
- Because it lives in the paid module, the advisor is a key **reason to upgrade** from
  base Nula: base users see a locked "Outreach Advisor" teaser that explains the value
  and links to upgrade.
- Writes still respect the trial/entitlement gate (`getActingWriter` /
  `useWriteGuard`) on top of the module gate.

---

## 8. Worked example — the VS guide as data

A trimmed illustration of the VS workspace's `outreach_profile`:

```jsonc
{
  "name": "VS Sales & BD Playbook",
  "positioning": "VS is your digital growth partner — web, Google, AI search, social, ads, email, CRM, content and automation working together to put more money in your pocket.",
  "offerings": ["Web", "SEO/AI search", "Social", "Paid ads", "Email", "CRM (Nula)", "Content", "Automation", "Analytics"],
  "verticals": [
    { "id": "trades", "label": "Trades", "primaryProblem": "Lead → Estimate → Booked Job",
      "strongQuestions": ["What's a booked job costing you — not a lead?", "What happens to estimates that don't close immediately?"],
      "preferredApproachIds": ["money-leak", "customer-economics", "local"] },
    { "id": "health", "label": "Health/Wellness/Fitness", "primaryProblem": "Acquisition → Booking → Retention",
      "strongQuestions": ["How many leads actually book?", "How much revenue is sitting in your inactive database?"],
      "preferredApproachIds": ["money-leak", "customer-economics", "system"] }
  ],
  "scoringSignals": [
    { "id": "weak-cta", "label": "Decent site, weak CTAs / no conversion path", "weight": 15, "source": "site",
      "detect": { "field": "site.hasClearCta", "op": "absent" }, "approachHint": { "approachId": "website", "weight": 20 } },
    { "id": "running-ads", "label": "Running Google/Meta ads", "weight": 10, "source": "site",
      "detect": { "field": "site.adsEvidence", "op": "present" }, "approachHint": { "approachId": "money-leak", "weight": 25 } },
    { "id": "high-ticket", "label": "High-value customers/jobs ($10k+)", "weight": 18, "source": "self",
      "approachHint": { "approachId": "customer-economics", "weight": 25 } },
    { "id": "multi-channel", "label": "Multiple channels, multiple vendors", "weight": 12, "source": "manual",
      "approachHint": { "approachId": "system", "weight": 25 } },
    { "id": "local-na", "label": "Huntsville / North Alabama owner", "weight": 8, "source": "self",
      "detect": { "field": "state", "op": "matches", "value": "AL" }, "approachHint": { "approachId": "local", "weight": 15 } },
    { "id": "barely-markets", "label": "Barely markets at all", "weight": -10, "source": "manual" }
  ],
  "approaches": [
    { "id": "money-leak", "name": "Where Is the Money Leaking?", "audience": ["sales","bd"],
      "useWhen": "Already investing in marketing but pieces are disconnected.",
      "pointToMake": "They may not need more marketing — they need to extract more revenue from what they already pay for.",
      "conversationStarter": "You're clearly investing in marketing. The thing I'd want to understand isn't whether you need more leads — it's how many of the leads you're already paying for become customers." },
    { "id": "customer-economics", "name": "One Customer Changes the Math", "audience": ["sales","bd"],
      "useWhen": "A single new customer is worth significant money.",
      "pointToMake": "Discuss customer economics, not impressions/clicks.",
      "conversationStarter": "What's one really good new customer worth to your business?" }
    // ...website, local, system
  ],
  "formula": [
    { "key": "observe", "label": "Observe", "guidance": "One specific thing you noticed." },
    { "key": "impact", "label": "Impact", "guidance": "What it may be costing them." },
    { "key": "pov", "label": "Point of view", "guidance": "The pieces have to work together." },
    { "key": "proof", "label": "Proof", "guidance": "Cite a real result only if provided." },
    { "key": "question", "label": "Question", "guidance": "Worth 10 minutes to look?" }
  ],
  "doNotSend": ["We can 10X your leads", "I guarantee page-one rankings", "We help businesses like yours grow", "generic service list dump", "insulting the prospect's website"]
}
```

A generated **Sales** email for a Trades prospect running ads with a weak landing
page would select **Money Leak** (+ optionally **Local**), fill OBSERVE = "you're
running Google Ads but the page they land on has no clear next step" and IMPACT =
"you may be paying for clicks that never become booked jobs," then render the formula
with the account's signature.

---

## 9. Build plan (independently shippable slices)

1. **Profile data model + editor** (`outreach_profiles`, Settings page, industry
   starter seeding). Ships value: a structured playbook even before scoring.
2. **Scorecard engine + card** (`lib/outreach/scorecard.ts`, site signals in
   brand‑fetch, assessment caching, contact/company Scorecard card).
3. **Email drafter** (`lib/outreach/draft.ts`, "Draft outreach" → rich composer,
   golden‑rule gate, deterministic fallback).
4. **AI command bar intents** + **target‑list integration** (per‑member angle +
   draft).
5. **Build‑from‑website / import‑a‑playbook** AI setup assists.
6. **Win‑rate stats** from target‑list status + enrichment feedback (learning loop v1).
7. (Later) **Auto‑tuning** of weights; **campaign sequence** generation.

Each slice is testable with Vitest (pure scoring/parse/template helpers) plus GUI
verification of the editor, scorecard, and composer, consistent with existing specs.

---

## 10. Open decisions (need product input)

1. ~~**Packaging**~~ — **Decided:** ships inside the upgraded intelligence package
   (B2B Intelligence add‑on), gated via `requireModule`; not in base Nula. See §7.
2. **One active profile vs. many** — e.g., separate Sales and BD profiles, or a
   single profile with audience emphasis (recommended to start: one profile, two
   emphases).
3. **How aggressive the "golden‑rule" gate is** — hard block vs. warn‑and‑allow when
   OBSERVE/IMPACT are thin.
4. **Auto‑tuning** — when to let outcomes move weights automatically vs. keep it
   advisory.
5. **Proof library** — where case studies/results live (per approach, per vertical,
   or a shared snippets library) and how we prevent unverified claims.
