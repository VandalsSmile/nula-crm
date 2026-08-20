# Nula Intelligence (Enrichment) — Stage 1 Design

Status: **Design proposal** (not yet implemented).
Goal: turn a thin lead (`name`, `email`, `company`, `website`, `phone`) into a
**smart, actionable record** with one **Enrich** button. Nula sends the record
to an enrichment supplier, gets structured data back, **normalizes** it into
Nula's own fields, **scores** it, **explains** it in plain English, and captures
**feedback** — so a small‑business owner who has never heard the words "data
enrichment" just sees their contact get smarter.

The product name is **Nula Intelligence** (a.k.a. **Nula Enrichment**). The
supplier — Clay for Stage 1 — is an **interchangeable adapter underneath** and is
never exposed to the user. The user's mental model is only: **Enrich → Understand
→ Recommend.**

---

## 1. Principles

1. **Feels native, supplier is invisible.** Users click **Enrich** and see Nula
   fields, a Nula fit score, and a Nula recommendation. "Clay" appears nowhere in
   the UI. The provider is an adapter behind an interface, swappable later.
2. **Interpret, don't just display.** The value is not raw fields — it's Nula's
   **Fit Score**, **AI Summary**, and **Recommended Next Step** derived from them.
3. **Enrichment improves segmentation.** Normalized attributes (industry, size,
   role, seniority, market, company type) flow into Nula's existing tag/group
   system so the AI command bar immediately gets more powerful.
4. **Build the feedback dataset from day one.** Capture `Clay data + Nula score +
   human feedback + actual outcome`. No ML in Stage 1 — just the dataset that makes
   Stage 2 (lookalikes / "what does a good prospect look like for *this*
   business") possible.
5. **Build on what exists.** Reuse the AI layer (`chatCompletion`), the
   tag/group executors, the webhook + audit patterns, workspace scoping, and the
   settings/secret conventions rather than inventing new machinery.
6. **Deliberately small.** No bidirectional sync, no sequences, no prospecting
   lists, no waterfall config, no workflow builder (see §12).

---

## 2. The Clay integration model (why the architecture is async)

Clay does **not** expose a traditional request/response REST API. The supported
pattern is two one‑way webhooks:

1. **Inbound to Clay** — each Clay table can be a "Monitor webhook" source with a
   unique URL. We `POST` a JSON record to that URL; Clay creates a row and runs
   its enrichment columns automatically. The URL is the secret (optionally plus a
   header auth token).
2. **Outbound from Clay** — the table's final **HTTP API column** `POST`s the
   enriched columns back to *our* callback endpoint. We pass a **callback
   correlation id** in the initial payload and map it through so we can match the
   result to the record that requested it.

So enrichment is **asynchronous**: Enrich → (submit, record goes `Enriching…`) →
Clay works → callback arrives → record updates. This maps directly onto Nula's
existing webhook + `lead_events`‑style audit pattern.

> Operational note: a Clay webhook table has a **50,000‑submission lifetime cap**
> (persists after row deletion) unless on an Enterprise "passthrough/auto‑delete"
> table. See §11.

```
User clicks [ Enrich ] on a Contact/Company
        │  (getActingWriter: plan‑gated mutation)
        ▼
enrichment_runs row: status=pending, correlationId=enr_… , requestPayload
        │
        ▼
POST → Clay table inbound webhook URL   { …identity…, _callback_url, _correlation_id }
        │                                          (workspace’s clayWebhookUrl)
        ▼
Clay creates row → runs enrichment columns → HTTP API column POSTs back
        │
        ▼
POST /api/webhooks/clay   (verify shared secret; respond 200 fast; process async)
        │  match correlationId → enrichment_runs
        ▼
Normalize → Score → Explain → update Contact/Company + tags/groups + activity
        ▼
Contact card shows: Fit 87/100 · AI summary · Recommended next step · fields
        ▼
User marks feedback (good/bad prospect, contact correct, opportunity, customer)
```

---

## 3. What exists today (reused building blocks)

| Capability | Where | How Stage 1 uses it |
|---|---|---|
| AI provider abstraction + fallback | `lib/ai/llm.ts` (`chatCompletion`, `resolveAiProvider`) | Generate the AI summary / recommendation; template fallback when no key |
| Lead summary + template fallback pattern | `lib/leads/summary.ts` (`generateLeadSummary`, `templateLeadSummary`) | Mirror for `lib/enrichment/summary.ts` |
| Scoring pattern | `lib/leads/scoring.ts` (`calculateLeadScore`) | Mirror for `lib/enrichment/fit-score.ts` |
| Score labels | `lib/crm-types.ts` (`leadScoreLabel`) | Add `fitScoreLabel` in the same style |
| Tag/group create‑if‑missing + apply | `app/actions/ai.ts` (`ensureTag`, `ensureGroup`), junctions with `onConflictDoNothing()` | Apply normalized attributes as system tags/groups |
| Per‑workspace secret config (never returned to client) | `workspace_settings.resendApiKey` + `app/actions/email-settings.ts` + `components/settings/email-settings.tsx` | Template for storing the Clay webhook URL + secrets |
| Webhook intake + raw audit + idempotency | `app/api/webhooks/leads`, `app/api/lead/[key]`, `lead_events` table | Template for `/api/webhooks/clay` + `enrichment_runs` |
| Activity/audit log | `activities` table, `app/actions/activities.ts` | Log "Enriched via Nula Intelligence" |
| Entitlement gating | `lib/entitlements.ts` (`getActingWriter`) | Gate the Enrich mutation |
| Workspace scoping | `lib/auth-helpers.ts` (`getActingUser`, `workspaceUserIdMatches`) | Scope every read/write |
| Migrations | `scripts/migrations/NNN_*.sql` (latest `027_bookings.sql`), `scripts/migrate.mjs` (idempotent, lexicographic) | Add `028_nula_intelligence.sql` |
| Detail action rows | `app/app/contacts/[id]/contact-profile.tsx`, `app/app/companies/[id]/company-detail-view.tsx` | Add the **Enrich** button + the intelligence card |
| Existing AI insight card (Sparkles) | `contact-profile.tsx` (`aiSummary` / `recommendedNextAction`) | Extend into the Nula Intelligence card |

**Reused contact columns** (already on the `contacts` row): `industry`,
`websiteUrl`, `aiSummary`, `recommendedNextAction`, `leadScore`. Stage 1 adds a
few new ones and keeps the long‑tail fields in JSON (see §5).

---

## 4. The five Stage 1 capabilities

Exactly five, scoped tight:

1. **Enrich** — send basic identifying info for a Contact or Company to the
   provider; receive enriched data (async via callback).
2. **Normalize** — convert the provider's raw result into Nula's standard fields
   and a consistent attribute taxonomy (industry, company size, location, role,
   seniority, market, company type).
3. **Score** — compute a simple, configurable **Fit Score** (0–100 + label).
4. **Explain** — Nula AI writes a 2–3 sentence "what we know / why it matters"
   summary plus a recommended next step.
5. **Feedback** — user marks the enrichment/contact/prospect as good/bad
   prospect, contact correct/incorrect, became opportunity, became customer.

---

## 5. Data model

### 5.1 New columns (denormalized for display + fast filtering)

Keep it lean — reuse existing columns, add only the high‑value structured ones.

**`contacts`** (migration `028`, `ADD COLUMN IF NOT EXISTS`, `NOT NULL DEFAULT`):
- `title` TEXT — person's job title
- `seniority` TEXT — normalized (`ic` | `manager` | `director` | `vp` | `c-level` | `owner`)
- `linkedinUrl` TEXT
- `fitScore` INTEGER DEFAULT 0
- `enrichedAt` TIMESTAMP (nullable) — data‑freshness
- `enrichmentStatus` TEXT DEFAULT `''` (`''` | `pending` | `enriched` | `failed`)
- *(reuse existing `industry`, `websiteUrl`, `aiSummary`, `recommendedNextAction`)*

**`companies`**:
- `industry` TEXT, `subIndustry` TEXT
- `employeeCount` INTEGER DEFAULT 0
- `revenueEstimate` TEXT — human range, e.g. `"$5M–$10M"` (avoid false precision)
- `companySize` TEXT — normalized bucket (see §6)
- `companyType` TEXT — e.g. `local` | `multi-location` | `regional` | `national`
- `linkedinUrl` TEXT, `description` TEXT, `techStack` TEXT
- `fitScore` INTEGER DEFAULT 0, `enrichedAt` TIMESTAMP, `enrichmentStatus` TEXT

The **full 10–15 field catalog** (including growth signals, decision‑maker status,
tech stack) is always stored on `enrichment_runs.normalized` (JSON) so the card
can render everything without a wide table; only the most‑queried fields are
promoted to columns above.

### 5.2 New tables

**`enrichment_runs`** — one row per Enrich request (audit + idempotency + payload
store; mirrors `lead_events`):

| Column | Type | Notes |
|---|---|---|
| `id` | text PK | `randomId("enr")` |
| `userId` | text NOT NULL | workspace scope id |
| `subjectType` | text | `contact` \| `company` |
| `subjectId` | text | contact/company id |
| `provider` | text | `clay` |
| `correlationId` | text UNIQUE | unguessable; matched on callback |
| `status` | text | `pending` \| `completed` \| `failed` \| `timed_out` |
| `requestPayload` | jsonb | what we sent |
| `responsePayload` | jsonb | raw provider result |
| `normalized` | jsonb | Nula‑normalized fields (the field catalog) |
| `fitScore` | integer | snapshot at completion |
| `error` | text | failure detail |
| `requestedBy` | text | user id |
| `requestedAt` | timestamp | defaultNow |
| `completedAt` | timestamp | nullable |

`UNIQUE(correlationId)` → idempotent, safe‑retryable callbacks.

**`enrichment_feedback`** — the learning dataset:

| Column | Type | Notes |
|---|---|---|
| `id` | text PK | |
| `userId` | text | workspace scope id |
| `subjectType`, `subjectId` | text | contact/company |
| `runId` | text | FK‑ish to `enrichment_runs.id` (the scored snapshot) |
| `signal` | text | `good_prospect` \| `bad_prospect` \| `contact_correct` \| `contact_incorrect` \| `became_opportunity` \| `became_customer` |
| `fitScoreAtFeedback` | integer | the score the human was reacting to |
| `note` | text | optional |
| `createdBy` | text | user id |
| `createdAt` | timestamp | defaultNow |

This is deliberately an append‑only signal log so we accumulate
`Clay data + Nula score + human feedback + outcome` for Stage 2.

### 5.3 `workspace_settings` config (mirror the Resend pattern)

- `clayWebhookUrl` TEXT — the Clay table inbound URL (secret; never returned to client)
- `clayAuthToken` TEXT — optional header token for the inbound POST
- `clayCallbackSecret` TEXT — shared secret we require on the callback (`X-Clay-Signature`)
- `enrichmentProvider` TEXT DEFAULT `''` — `clay` when configured
- `autoEnrichOnIntake` BOOLEAN DEFAULT false — **off** in Stage 1

**Platform fallback (env only):** `CLAY_WEBHOOK_URL`, `CLAY_CALLBACK_SECRET` — so
a single shared Clay table can back the demo without per‑workspace setup, exactly
like `RESEND_API_KEY` falls back to platform env.

---

## 6. Normalize: raw fields → Nula attributes

The 10–15 fields Clay returns and why Nula cares:

| Field (normalized key) | Why Nula cares |
|---|---|
| `domain` / website | Identity |
| `industry`, `subIndustry` | Segmentation |
| `location` (city/state/market) | Territory |
| `employeeCount` | Company size |
| `revenueEstimate` | Qualification |
| `linkedinUrl` (company + person) | Research |
| `title` | Buying authority |
| `workEmail` | Outreach |
| `phone` | Outreach |
| `description` | AI context |
| `techStack` | Sales/marketing signal |
| `growthSignals` | Timing |
| `decisionMaker` (bool) + `seniority` | Qualification |
| `enrichedAt` | Data freshness |

**Normalization** (`lib/enrichment/normalize.ts`) maps messy provider values into
stable Nula buckets and then into **system tags** so segmentation "just works":

- Company size bucket from `employeeCount`:
  `Solo (1)`, `Micro (2–9)`, `SMB – Small (10–49)`, `SMB – Established (50–199)`,
  `Mid‑Market (200–999)`, `Enterprise (1000+)`.
- Seniority from `title`: `IC → Manager → Director → VP → C‑Level → Owner`;
  `decisionMaker = seniority ≥ Director` (configurable).
- Market from city/state (e.g. `Huntsville, Alabama`).
- Company type from location count / footprint signals.

**Applied as system tags** via the existing `ensureTag` + junction executors, using
a namespaced slug convention so the taxonomy stays clean and queryable:

```
industry-healthcare   subindustry-orthopedics   size-smb-established
role-marketing        seniority-decision-maker  market-huntsville
type-multi-location
```

(Tags describe facts — consistent with the existing "tags = facts, groups =
audiences" rule.) Groups (audiences) are **not** auto‑created in Stage 1 beyond
what routing already does; the AI command bar can spin up audiences on demand from
these facts.

**Worked example** (the demo):

```
Before:  Bob Smith  ·  bob@huntsvilleortho.com   (Nula knows almost nothing)

After:   Bob Smith — Marketing Director
         Huntsville Orthopedics · Healthcare → Orthopedics
         Huntsville, Alabama · 43 employees · $5M–$10M est. · multi‑location
         Tags: industry-healthcare, subindustry-orthopedics,
               size-smb-established, role-marketing,
               seniority-decision-maker, market-huntsville, type-multi-location
         Fit 88/100 — Strong
```

Segmentation payoff (works because the tags exist) via the AI command bar:
- "Show me all healthcare decision makers."
- "Create a segment of companies with more than 20 employees."
- "Find our best Alabama prospects."

> Integration note: `search_contacts` / `apply_tag` / `add_to_group` already filter
> by tags. To make free‑text queries like "healthcare decision makers" map onto
> `industry-healthcare` + `seniority-decision-maker`, extend the interpreter's
> known‑taxonomy hint in `lib/ai/interpret-with-llm.ts` with the enrichment tag
> namespaces. This is a small, additive prompt change — not a new subsystem.

---

## 7. Score: the Fit Score

`lib/enrichment/fit-score.ts` — a small, transparent, **configurable** weighted
model in the exact spirit of `calculateLeadScore` (no ML):

```
fit = base
    + weight_size(employeeCount)          // scale to support the service
    + weight_revenue(revenueEstimate)     // ability to pay
    + weight_industry(industry ∈ ICP)     // fit to what this business sells
    + weight_seniority(decisionMaker)     // reachable buying authority
    + weight_completeness(fieldsPresent)  // data confidence
    clamp 0..100
```

- Add `fitScoreLabel(score)` mirroring `leadScoreLabel`:
  `Strong (≥80) · Good (≥60) · Fair (≥40) · Weak`.
- Stage 1 ships sane defaults; the ICP inputs (target industries, min size) can
  read from `workspace_settings` (a tiny config), leaving room to make weights
  user‑editable later without a schema change.
- Fit Score is **distinct** from `leadScore` (intent/behavior at intake). Fit =
  "is this the *kind* of company we want"; Lead = "how hot is this specific
  lead right now". Both display; they answer different questions.

---

## 8. Explain: the AI narrative

`lib/enrichment/summary.ts` — reuse `chatCompletion` with a focused prompt over
the normalized fields; **template fallback** when no LLM key (mirrors
`templateLeadSummary`). Produces two short strings stored on the record
(`aiSummary`, `recommendedNextAction`):

- **AI Summary** — e.g. *"Established local healthcare company, ~35 employees,
  est. $4–6M revenue. Enough scale and customer value to support professional
  marketing investment."*
- **Recommended Next Step** — e.g. *"High‑priority prospect. Review website and
  current paid‑search presence before outreach."*

Same JSON‑mode, low‑temperature call already used elsewhere; no new AI infra.

---

## 9. Feedback: build the dataset

On the intelligence card, one‑tap controls write `enrichment_feedback` rows:

```
Fit 88 — Strong        [ ✓ Good prospect ] [ ✗ Bad prospect ]
Contact info:          [ ✓ Correct ]       [ ✗ Incorrect ]
Outcome:               [ Became opportunity ] [ Became customer ]
```

- `became_opportunity` / `became_customer` can also be **inferred** later from the
  `deals` pipeline, but Stage 1 captures explicit taps too (cheap, unambiguous).
- No ML now. We are just accumulating, per workspace:
  `Clay data → Nula fit score → human judgment → real outcome`.
- This is the seed for Stage 2's differentiator: *what does a good prospect look
  like for **this** business?*

---

## 10. UI / UX

- **Enrich button.** Contact detail action row (`contact-profile.tsx`, next to
  Edit / Record purchase) and Company detail `PageHeader` actions
  (`company-detail-view.tsx`, next to Edit / Merge). Label: **Enrich** (with a
  Sparkles/Wand icon). Disabled + "Enriching…" while a run is `pending`.
- **Nula Intelligence card.** Extends the existing Sparkles "AI insight" card:
  Fit Score badge, AI summary, recommended next step, a compact grid of key
  enriched fields, "Enriched {date}" freshness line, feedback controls, and a
  **Re‑enrich** button. Empty state before first enrichment: a single **Enrich**
  CTA explaining "Let Nula research this contact."
- **Settings → Intelligence** (new tab, admin‑gated via `canManageSettings`).
  Paste the Clay webhook URL + callback secret, **Test connection** (send a
  sample record and confirm a callback round‑trips), toggle
  `autoEnrichOnIntake` (default off). Mirrors `EmailSettings` (secret write‑only,
  never echoed back).
- **Provider stays invisible** — copy says "Nula Intelligence" / "Enrich",
  never "Clay".
- Bulk enrich from the contacts list is intentionally **out of Stage 1** (single
  record only) to keep the MVP tight; the callback/normalize core makes it easy to
  add later.

---

## 11. Cross‑cutting concerns

- **Security.** Clay webhook URL + secrets stored server‑side on
  `workspace_settings`, never returned to the client (Resend pattern). Callback
  `/api/webhooks/clay` verifies the shared secret and an unguessable
  `correlationId`; unknown/mismatched ids are dropped. Respond `200` immediately,
  process async (Clay expects a fast ack).
- **Idempotency & reliability.** `UNIQUE(correlationId)` makes duplicate callbacks
  no‑ops. Pending runs that never call back are swept to `timed_out` by a periodic
  job — reuse the existing daily cron `GET /api/cron/automations` (or a sibling
  route) to expire runs older than N minutes and flip `enrichmentStatus`.
- **Rate/cost control.** Rate‑limit Enrich per workspace; enrichment costs money,
  so no auto‑enrich by default. Show freshness so users don't re‑enrich needlessly.
- **Clay 50k webhook cap.** A monitor‑webhook table caps at 50,000 lifetime
  submissions. Document rotating the table URL (update `clayWebhookUrl`) or using
  an Enterprise passthrough table; surface remaining‑capacity guidance in
  Settings. Platform‑shared demo table uses the env fallback.
- **Entitlements & scoping.** Enrich and feedback are mutations →
  `getActingWriter()` (plan‑gated). The callback resolves the workspace from the
  stored `enrichment_runs.userId` (no user session), then writes with
  `workspaceUserIdMatches(...)`. All reads scoped.
- **Privacy.** Enriched PII lives on the contact/company row; raw provider
  payloads on `enrichment_runs` are retention‑capped. Honor existing opt‑out.

---

## 12. Explicitly NOT in Stage 1

Per the product brief, do **not** build: bidirectional table sync, automated
outbound sequences, large Clay prospecting lists, multiple enrichment providers,
waterfall configuration, enrichment workflow builders, or any exposure of Clay's
complexity to the user. Keep it: **Enrich → Understand → Recommend.**

---

## 13. Build breakdown (independently shippable slices)

Difficulty is characterized by which subsystems change, not calendar time.

- **1a — Foundation.** Migration `028_nula_intelligence.sql` (new columns +
  `enrichment_runs` + `enrichment_feedback`), Drizzle schema, mappers/types, and
  `workspace_settings` config. Provider interface `lib/enrichment/provider.ts`
  (`EnrichmentProvider`) + `ClayProvider.submit()`. Settings → Intelligence tab
  with save + **Test connection**. *Touches:* schema, migrations, settings action +
  UI. Low risk; no user‑visible enrichment yet.
- **1b — Enrich + callback loop.** `enrichContact` / `enrichCompany` server
  actions (create `enrichment_runs`, POST to Clay, set `pending`). Callback
  `POST /api/webhooks/clay` (verify, correlate, store raw). Enrich buttons +
  pending state + activity log. *Touches:* server actions, one API route, two
  detail components. This is the core plumbing.
- **1c — Normalize + Score.** `lib/enrichment/normalize.ts` (fields → buckets →
  system tags via `ensureTag`) and `lib/enrichment/fit-score.ts` + `fitScoreLabel`.
  Wire into the callback. *Touches:* two pure libs + callback + tag executors.
- **1d — Explain.** `lib/enrichment/summary.ts` over `chatCompletion` with
  template fallback; store `aiSummary` / `recommendedNextAction`. *Touches:* one
  lib + callback. Reuses AI layer entirely.
- **1e — Feedback + card polish.** `enrichment_feedback` write actions + one‑tap
  controls; finalize the Nula Intelligence card and empty state. *Touches:* one
  action file + card component.

**Recommended first slice:** 1a + 1b together (a real round‑trip that flips a
record to "enriched" and stores raw data) — the riskiest integration point — then
layer 1c → 1d → 1e, each of which visibly upgrades the same card.

**Testing.** Unit tests (vitest, matching `tests/`) for `normalize`,
`fit-score`, and callback correlation/idempotency; a mocked Clay callback for the
round‑trip; manual before/after demo on a real record for the walkthrough.

---

## 14. Stage 2 preview (natural next leap)

With the feedback dataset accumulating, the question flips from *"what can the
supplier tell me about this lead?"* to *"based on the customers we've actually
won, find more companies that look like them."* The normalized attributes + Fit
Score + `enrichment_feedback` outcomes become the seed profile for lookalike
discovery — turning Nula Intelligence from a per‑record CRM feature into a growth
engine. Nothing in Stage 1 blocks it; the provider interface and the dataset are
designed for exactly that.

---

## 15. Open decisions (need input before building)

1. **Field mapping specifics** — the exact Clay column names/HTTP‑API body we map
   to the normalized keys (depends on the Clay table you build).
2. **Columns vs JSON** — confirm the promoted columns in §5.1 (everything else
   stays in `enrichment_runs.normalized`).
3. **Fit‑score defaults** — starting weights and where ICP (target industries /
   min size) is configured for Stage 1.
4. **Shared vs per‑workspace Clay table** — platform env fallback for the demo vs.
   per‑workspace URL; and the 50k‑cap handling.
5. **Auto‑enrich on intake** — keep off for Stage 1 (recommended) or allow an
   opt‑in per workspace.
6. **Company → contacts cascade** — does enriching a company backfill its linked
   contacts (or vice versa)?
