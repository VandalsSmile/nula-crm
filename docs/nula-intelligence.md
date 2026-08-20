# Nula B2B Intelligence Module — Stage 1 Design

Status: **Design proposal** (not yet implemented).

Goal: turn a thin lead (`name`, `email`, `company`, `website`, `phone`) into a
**smart, actionable record** with one **Enrich** button — packaged as an **optional,
paid add‑on module** that is **off by default** and can be **enabled anytime via
checkout**. Nula sends the record to an enrichment supplier, gets structured data
back, **normalizes** it into Nula's own fields, **scores** it, **explains** it in
plain English, and captures **feedback** — so a small‑business owner who has never
heard the words "data enrichment" just sees their contacts get smarter.

Two framing decisions drive this document:

- **It's a module, not a core feature.** The capability is **Nula Intelligence**;
  the Stage 1 packaging is the **Nula B2B Intelligence** add‑on. It is **disabled
  by default**, gated behind its **own recurring subscription (MRR)** separate
  from the base plan, and only mounts its UI/behavior when a workspace has enabled
  it. When it's off, the app looks exactly as it does today.
- **It's B2B‑oriented, on purpose.** Clay (the Stage 1 supplier) enriches
  **companies and business people** — firmographics, titles, tech stack. That's
  gold for a B2B small business and largely irrelevant for a pure B2C shop (a spa's
  walk‑in clients have no "employee count"). So the module is branded **B2B
  Intelligence**, **recommended** to B2B‑type workspaces, and **quietly available**
  (not pushed) to everyone else. The provider sits behind an interface so a future
  **consumer** intelligence module could plug in the same way.

The user's mental model stays simple: **Enrich → Understand → Recommend.** "Clay"
appears nowhere in the UI.

---

## 1. Principles

1. **Off by default, paid, self‑serve to enable.** No enrichment UI or behavior
   exists for a workspace until an owner enables the module and completes checkout.
   Enabling and disabling is a self‑serve, reversible billing action.
2. **A clean, self‑contained module.** All enrichment code lives under
   `lib/enrichment/**`, `app/actions/enrichment.ts`, `app/api/webhooks/clay`, and a
   handful of module‑gated UI mounts. Nothing in the core CRM depends on it; remove
   the gate and the app is unchanged.
3. **Company‑type aware.** Availability is universal (any owner can pay to turn it
   on), but **discovery/promotion** is aware of B2B vs B2C so we don't upsell a
   B2B firmographics tool to a nail salon.
4. **Feels native, supplier is invisible.** Users see Nula fields, a Nula fit
   score, and a Nula recommendation. The supplier is an adapter behind an interface.
5. **Interpret, don't just display.** The value is the **Fit Score**, **AI
   Summary**, and **Recommended Next Step** — not raw fields.
6. **Enrichment improves segmentation.** Normalized attributes flow into Nula's
   existing tag/group system so the AI command bar gets more powerful.
7. **Build the feedback dataset from day one** (`Clay data + Nula score + human
   feedback + outcome`) — the seed for Stage 2 lookalikes. No ML in Stage 1.
8. **Build on what exists.** Reuse the AI layer, tag/group executors, the
   Square billing + webhook pattern, workspace scoping, and the settings/secret
   conventions.

---

## 2. Who it's for: B2B vs B2C

Today the workspace has a `businessType` (vertical: `general`, `iv-therapy`,
`b2b`, `hospitality`, …) in `lib/crm-defaults.ts`, set during onboarding. It is
**not** a clean B2B/B2C axis and is used only for default tags/groups.

**Recommendation:** add a lightweight, explicit **`companyModel`** hint
(`b2b` | `b2c` | `both`) on `workspace_settings`, defaulted from `businessType`
during onboarding (e.g. `b2b` vertical → `b2b`; wellness/hospitality → `b2c`) and
editable in the company profile. This drives **promotion only**:

| `companyModel` | Module behavior |
|---|---|
| `b2b` / `both` | Module **recommended** — shown in Settings → Plan and a dashboard discovery card ("Make your leads smarter with B2B Intelligence"). |
| `b2c` | Module **available but not promoted** — reachable from Settings if the owner goes looking; a one‑line note explains it's built for B2B data. |
| any | Enabling is always the owner's choice + payment. We never hard‑block by type. |

This keeps the door open for a future **Nula Consumer Intelligence** module (a
consumer‑data provider behind the same interface) aimed at B2C workspaces.

---

## 3. The Clay integration model (why the runtime is async)

Clay does **not** expose a traditional request/response REST API. The supported
pattern is two one‑way webhooks:

1. **Inbound to Clay** — each Clay table can be a "Monitor webhook" source with a
   unique URL. We `POST` a JSON record; Clay creates a row and runs its enrichment
   columns automatically. The URL is the secret (optionally plus a header token).
2. **Outbound from Clay** — the table's final **HTTP API column** `POST`s the
   enriched columns back to *our* callback endpoint. We pass a **callback
   correlation id** in the initial payload and map it through, to match the result
   to the requesting record.

So enrichment is **asynchronous**: Enrich → (submit, record goes `Enriching…`) →
Clay works → callback arrives → record updates. This maps directly onto Nula's
existing webhook + audit patterns.

> Operational note: a Clay webhook table has a **50,000‑submission lifetime cap**
> (persists after row deletion) unless on an Enterprise "passthrough/auto‑delete"
> table. See §13.

```
Owner enables "B2B Intelligence" ── Settings → Plan ──▶ Square checkout (add‑on)
        │                                                     │ webhook: subscription.created
        ▼                                                     ▼
  workspace_addons: b2b_intelligence = active  ◀──────────────┘
        │  (module now mounts its UI + unlocks its actions)
        ▼
User clicks [ Enrich ] on a Contact/Company
        │  requireModule("b2b_intelligence")  +  getActingWriter (base plan)  +  quota check
        ▼
enrichment_runs row: status=pending, correlationId=enr_… , requestPayload
        │
        ▼
POST → Clay table inbound webhook URL   { …identity…, _callback_url, _correlation_id }
        │
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

## 4. Module packaging, gating & billing (the core adaptation)

The base plan today is **Square‑only**, a **single** subscription per workspace
(`workspace_settings.squareSubscriptionId` / `priceId`), with a **whole‑workspace
write gate** (`isEntitled(plan, trialEndsAt)`) and **no per‑feature
entitlements**. The add‑on must layer on top **without disturbing base Pro
checkout**.

### 4.1 Entitlement model — a second, independent gate

Because the base `plan` gate answers "can this workspace write to the CRM at all",
we need a **separate** answer to "does this workspace have the B2B Intelligence
module". Two independent gates, both required for an Enrich action:

- Base plan (existing): `getActingWriter()` → `requireActiveWorkspace()`.
- Module (new): `requireModule("b2b_intelligence")`.

**Storage** — a child table (the current single‑slot subscription columns can't
hold a second product):

**`workspace_addons`**

| Column | Type | Notes |
|---|---|---|
| `id` | text PK | |
| `workspaceId` | text NOT NULL | index |
| `addonId` | text | `b2b_intelligence` (room for future modules) |
| `status` | text | `active` \| `canceled` \| `past_due` \| `trialing` |
| `squareSubscriptionId` | text | the add‑on's own Square subscription |
| `squareCustomerId` | text | for webhook lookup |
| `priceId` | text | add‑on plan variation id |
| `currentPeriodEnd` | timestamp | |
| `creditsUsedThisPeriod` | integer | metering (see §4.5) |
| `periodResetAt` | timestamp | monthly quota reset |
| `enabledBy` | text | user id |
| `createdAt` / `updatedAt` | timestamp | |

`UNIQUE(workspaceId, addonId)`.

**Helpers** (new `lib/modules.ts`, sibling to `lib/entitlements.ts`):

```ts
isModuleEnabled(workspaceId, "b2b_intelligence"): Promise<boolean>
   // active OR (canceled but currentPeriodEnd in the future) — access until period end
requireModule(addonId)   // throws MODULE_DISABLED_MESSAGE if not enabled
getModuleState(workspaceId)  // for UI: status, renewsAt, creditsUsed/limit
```

This mirrors `isWorkspaceEntitled` / `requireActiveWorkspace` exactly, just keyed
by addon. It is the **only** new concept in the entitlement layer.

### 4.2 Billing — a second Square subscription

Reuse the existing Square path (`lib/square.ts`, `createSubscriptionPaymentLink`,
`app/actions/billing.ts`) with an add‑on catalog entry and a dedicated action:

- **Catalog:** extend `lib/billing/plans.ts` with an `ADDONS` list, e.g.
  `b2b-intelligence-monthly` / `-annual`, priced from
  `SQUARE_PLAN_ADDON_B2B_INTEL_MONTHLY` / `_ANNUAL` env vars.
- **Action:** `createAddonCheckout(addonId)` — Owner‑only, mirrors
  `createCheckout`, redirects to
  `{origin}/app/settings?tab=plan&addon=b2b_intelligence&checkout=success`.
- **Cancel:** `cancelAddon(addonId)` → `cancelSquareSubscription(...)` on the
  add‑on's own `squareSubscriptionId`; webhook flips `workspace_addons.status`.

**Webhook branching** (`app/api/webhooks/square/route.ts`): `handleSubscription`
must distinguish base Pro from the add‑on by `plan_variation_id`:

```
planVariationId ∈ base PLANS      → applySubscription()      (existing, unchanged)
planVariationId ∈ ADDONS          → applyAddonSubscription() (new: upsert workspace_addons)
else                               → ignore
```

Workspace resolution is unchanged (`NULA_SHARED_WORKSPACE_ID` → `squareCustomerId`
→ customer email → owner). This keeps base checkout byte‑for‑byte the same and
adds a parallel path for the module. (Also fixes the existing single‑slot
assumption for anything beyond one product.)

### 4.3 Enable / disable lifecycle

```
Enable  : Settings → Plan → "Add B2B Intelligence" → createAddonCheckout → Square
          → webhook subscription.created → workspace_addons.status = active
          → module UI mounts; Enrich actions unlock
Disable : Settings → Plan → "Cancel add‑on" → cancelAddon → Square
          → webhook subscription.canceled → status = canceled
          → access remains until currentPeriodEnd, then UI hides
Data    : disabling NEVER deletes enriched data. Existing enriched fields, tags,
          enrichment_runs, and feedback are retained (read‑only); only the ability
          to run NEW enrichments is removed. Re‑enabling restores full function.
```

Dev/no‑Square fallback: mirror `activatePlan()` — when Square env is absent, an
owner can flip the module on for local/demo without checkout.

### 4.4 What changes in existing workspace artifacts when the module is ON

The module is **additive and conditional**. Everything below is gated by
`isModuleEnabled(...)` (server) and a `useModuleEnabled("b2b_intelligence")` hook
(client). When OFF, none of it renders and the actions hard‑block.

| Surface | When module OFF | When module ON |
|---|---|---|
| Contact detail action row (`contact-profile.tsx`) | unchanged | **Enrich** button added |
| Company detail header (`company-detail-view.tsx`) | unchanged | **Enrich** button added |
| Contact/company "AI insight" card | unchanged | becomes the **Nula Intelligence** card (fit score, fields, feedback, re‑enrich) |
| Settings tabs (`settings-view.tsx`) | no Intelligence tab | **Intelligence** tab added (config: Clay URL/secret, test, freshness, quota) |
| Settings → Plan | shows the add‑on as an **upsell** (B2B/both) or a quiet line (b2c) | shows add‑on as **active** with manage/cancel |
| Dashboard | unchanged | optional discovery card retires; may show "enriched this month / credits left" |
| AI command bar interpreter | unchanged taxonomy | taxonomy hint extended with enrichment tag namespaces (`industry-*`, `seniority-*`, …) so "healthcare decision makers" resolves |
| Contacts list | unchanged | (Stage 1) no bulk enrich; single‑record only |

Server actions (`enrichContact`, `enrichCompany`, feedback writes) always call
`requireModule(...)` first, so even a crafted request can't enrich without an
active module.

### 4.5 Pricing (MRR) — decision, with a recommendation

- Charge a **flat monthly/annual add‑on** on top of base Pro ($29/mo). Suggested
  anchor: **$39–$49/mo** (annual discount mirroring base), **decision pending**.
- Because enrichment costs real supplier money (and Clay tables cap at 50k),
  include a **monthly credit allowance** (e.g. *N enrichments/mo*), metered on
  `workspace_addons.creditsUsedThisPeriod` and enforced in `requireModule` /
  `enrich*`. Over‑limit → a clear "you've used your monthly enrichments" state
  (Stage 1 blocks; usage‑based overage is a later option). This caps COGS and
  makes the MRR margin predictable.

---

## 5. Reused building blocks

| Capability | Where | How Stage 1 uses it |
|---|---|---|
| Square checkout + webhook | `lib/square.ts`, `app/actions/billing.ts`, `app/api/webhooks/square/route.ts` | Add‑on subscription + webhook branching |
| Plan catalog | `lib/billing/plans.ts` | Add `ADDONS` entries |
| Plan UI | `components/settings/plan-settings.tsx` | Add‑on enable/cancel + upsell |
| Entitlement pattern | `lib/entitlements.ts`, `lib/trial.ts` | Model `lib/modules.ts` on it |
| AI provider + fallback | `lib/ai/llm.ts` (`chatCompletion`) | AI summary/recommendation |
| Lead summary/template fallback | `lib/leads/summary.ts` | Mirror for `lib/enrichment/summary.ts` |
| Scoring + labels | `lib/leads/scoring.ts`, `leadScoreLabel` | Mirror for `lib/enrichment/fit-score.ts` + `fitScoreLabel` |
| Tag/group apply | `app/actions/ai.ts` (`ensureTag`, `ensureGroup`), `onConflictDoNothing()` | Apply normalized attributes |
| Per‑workspace secrets | `workspace_settings.resendApiKey` + `email-settings.ts` | Clay URL/secret storage |
| Webhook intake + audit + idempotency | `app/api/webhooks/leads`, `lead_events` | `/api/webhooks/clay` + `enrichment_runs` |
| Activity log | `activities`, `app/actions/activities.ts` | "Enriched via Nula Intelligence" |
| Workspace scoping | `lib/auth-helpers.ts` | Scope every read/write |
| Business type | `lib/crm-defaults.ts`, onboarding | Seed `companyModel` + promotion |
| Cron sweep | `GET /api/cron/automations` | Expire timed‑out pending runs; reset credits |
| Migrations | `scripts/migrations/NNN_*.sql` (latest `027`), `scripts/migrate.mjs` | `028_nula_intelligence.sql` |
| Detail action rows + AI card | `contact-profile.tsx`, `company-detail-view.tsx` | Enrich button + intelligence card |

**Reused contact columns** (already present): `industry`, `websiteUrl`,
`aiSummary`, `recommendedNextAction`, `leadScore`.

---

## 6. The five Stage 1 capabilities

Exactly five, all gated by the module:

1. **Enrich** — send identifying info for a Contact or Company; receive enriched
   data (async via callback).
2. **Normalize** — convert the raw result into Nula's standard fields + a
   consistent attribute taxonomy.
3. **Score** — compute a configurable **Fit Score** (0–100 + label).
4. **Explain** — AI writes a 2–3 sentence "what we know / why it matters" summary
   + recommended next step.
5. **Feedback** — user marks good/bad prospect, contact correct/incorrect, became
   opportunity, became customer.

---

## 7. Data model

### 7.1 New columns (denormalized for display + filtering)

**`contacts`** (migration `028`, `ADD COLUMN IF NOT EXISTS`, `NOT NULL DEFAULT`):
`title`, `seniority` (`ic|manager|director|vp|c-level|owner`), `linkedinUrl`,
`fitScore` INT DEFAULT 0, `enrichedAt` TIMESTAMP, `enrichmentStatus` TEXT
(`''|pending|enriched|failed`). *(reuse `industry`, `websiteUrl`, `aiSummary`,
`recommendedNextAction`)*

**`companies`:** `industry`, `subIndustry`, `employeeCount` INT, `revenueEstimate`
TEXT (human range, e.g. `"$5M–$10M"`), `companySize` (bucket), `companyType`
(`local|multi-location|regional|national`), `linkedinUrl`, `description`,
`techStack`, `fitScore` INT, `enrichedAt`, `enrichmentStatus`.

The full 10–15 field catalog always lives on `enrichment_runs.normalized` (JSON);
only the most‑queried fields are promoted to columns.

### 7.2 New tables

- **`workspace_addons`** — module subscription + metering (see §4.1).
- **`enrichment_runs`** — one row per Enrich request (audit/idempotency/payload):
  `id`, `userId`, `subjectType` (`contact|company`), `subjectId`, `provider`
  (`clay`), `correlationId` **UNIQUE**, `status` (`pending|completed|failed|
  timed_out`), `requestPayload` jsonb, `responsePayload` jsonb, `normalized` jsonb,
  `fitScore` int, `error` text, `requestedBy`, `requestedAt`, `completedAt`.
  `UNIQUE(correlationId)` → idempotent, safe‑retryable callbacks.
- **`enrichment_feedback`** — append‑only learning dataset: `id`, `userId`,
  `subjectType`, `subjectId`, `runId`, `signal`
  (`good_prospect|bad_prospect|contact_correct|contact_incorrect|
  became_opportunity|became_customer`), `fitScoreAtFeedback` int, `note`,
  `createdBy`, `createdAt`.

### 7.3 `workspace_settings` additions

- `companyModel` TEXT DEFAULT `''` (`b2b|b2c|both`) — promotion hint (§2).
- Clay config (mirror Resend, secrets write‑only): `clayWebhookUrl`,
  `clayAuthToken`, `clayCallbackSecret`.
- `autoEnrichOnIntake` BOOLEAN DEFAULT false — **off** in Stage 1.

**Platform env fallback:** `CLAY_WEBHOOK_URL`, `CLAY_CALLBACK_SECRET`,
`SQUARE_PLAN_ADDON_B2B_INTEL_MONTHLY`, `SQUARE_PLAN_ADDON_B2B_INTEL_ANNUAL`.

---

## 8. Normalize: raw fields → Nula attributes

The 10–15 fields Clay returns and why Nula cares: company website/domain
(identity), industry/sub‑industry (segmentation), location (territory), employee
count (size), revenue estimate (qualification), LinkedIn (research), title (buying
authority), work email + phone (outreach), description (AI context), tech stack
(signal), growth signals (timing), decision‑maker + seniority (qualification),
enrichment date (freshness).

`lib/enrichment/normalize.ts` maps messy values into stable Nula buckets, then
into **system tags** (via `ensureTag` + junctions) using a namespaced slug
convention so segmentation "just works":

```
industry-healthcare   subindustry-orthopedics   size-smb-established
role-marketing        seniority-decision-maker  market-huntsville
type-multi-location
```

- Company size from `employeeCount`: `Solo (1)`, `Micro (2–9)`,
  `SMB – Small (10–49)`, `SMB – Established (50–199)`, `Mid‑Market (200–999)`,
  `Enterprise (1000+)`.
- Seniority from `title`: `IC → Manager → Director → VP → C‑Level → Owner`;
  `decisionMaker = seniority ≥ Director` (configurable).
- Market from city/state; company type from footprint signals.

**Worked example (the demo):**

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

Segmentation payoff via the AI command bar: "Show me all healthcare decision
makers." · "Create a segment of companies with more than 20 employees." · "Find
our best Alabama prospects."

> Integration note: to make free‑text queries map onto `industry-healthcare` +
> `seniority-decision-maker`, extend the interpreter's taxonomy hint in
> `lib/ai/interpret-with-llm.ts` with the enrichment tag namespaces — a small
> additive prompt change, and only when the module is enabled.

---

## 9. Score: the Fit Score

`lib/enrichment/fit-score.ts` — a small, transparent, configurable weighted model
in the spirit of `calculateLeadScore` (no ML):

```
fit = base
    + weight_size(employeeCount)          // scale to support the service
    + weight_revenue(revenueEstimate)     // ability to pay
    + weight_industry(industry ∈ ICP)     // fit to what this business sells
    + weight_seniority(decisionMaker)     // reachable buying authority
    + weight_completeness(fieldsPresent)  // data confidence
    clamp 0..100
```

`fitScoreLabel(score)`: `Strong (≥80) · Good (≥60) · Fair (≥40) · Weak`. ICP
inputs (target industries, min size) read from `workspace_settings`. Fit Score is
**distinct** from `leadScore`: fit = "is this the *kind* of company we want"; lead
= "how hot is this specific lead right now". Both display.

---

## 10. Explain: the AI narrative

`lib/enrichment/summary.ts` — reuse `chatCompletion` over the normalized fields
with a **template fallback** when no LLM key (mirrors `templateLeadSummary`).
Produces `aiSummary` + `recommendedNextAction`, e.g. *"Established local
healthcare company, ~35 employees, est. $4–6M revenue. Enough scale and customer
value to support professional marketing investment."* → *"High‑priority prospect.
Review website and current paid‑search presence before outreach."*

---

## 11. Feedback: build the dataset

One‑tap controls on the intelligence card write `enrichment_feedback` rows:

```
Fit 88 — Strong        [ ✓ Good prospect ] [ ✗ Bad prospect ]
Contact info:          [ ✓ Correct ]       [ ✗ Incorrect ]
Outcome:               [ Became opportunity ] [ Became customer ]
```

`became_*` can also be inferred later from the `deals` pipeline; Stage 1 also
captures explicit taps. No ML — we accumulate, per workspace, `Clay data → Nula
fit score → human judgment → real outcome`, the seed for Stage 2.

---

## 12. UI / UX (all module‑gated)

- **Enrich button.** Contact detail action row and Company detail header. Disabled
  + "Enriching…" while a run is `pending`. Only rendered when the module is on.
- **Nula Intelligence card.** Extends the existing Sparkles "AI insight" card: Fit
  Score badge, AI summary, recommended next step, compact enriched‑fields grid,
  "Enriched {date}" freshness, feedback controls, Re‑enrich button, and a "credits
  left this month" line.
- **Settings → Intelligence** (new tab, admin‑gated, only when module on): Clay
  webhook URL + callback secret, **Test connection**, freshness/quota, toggle
  `autoEnrichOnIntake` (default off). Secrets write‑only (Resend pattern).
- **Settings → Plan:** for `b2b`/`both`, an **"Add B2B Intelligence — $X/mo"**
  upsell card (enable → checkout); for `b2c`, a quiet single line. When active,
  shows status + renew/cancel.
- **Discovery (promotion only):** a dismissible dashboard card for B2B/both
  workspaces that don't have it yet ("Make your leads smarter…"). Never shown to
  b2c.
- **Provider stays invisible.** Copy says "Nula Intelligence" / "Enrich".
- Bulk enrich from the contacts list is intentionally out of Stage 1.

---

## 13. Cross‑cutting concerns

- **Two gates.** Enrich requires **both** `getActingWriter()` (base plan) **and**
  `requireModule("b2b_intelligence")` (add‑on), plus a **quota** check. Reads of
  already‑enriched data need neither (data is retained if the module lapses).
- **Security.** Clay URL + secrets stored server‑side, never returned to client.
  `/api/webhooks/clay` verifies the shared secret + unguessable `correlationId`;
  responds `200` fast, processes async. The Square webhook branches by
  `plan_variation_id` and never lets an add‑on event corrupt base plan state.
- **Idempotency.** `UNIQUE(correlationId)` makes duplicate callbacks no‑ops.
  Pending runs with no callback are swept to `timed_out` by the daily cron; the
  same cron resets `creditsUsedThisPeriod` at `periodResetAt`.
- **Rate/cost.** Per‑workspace monthly credits (COGS cap), rate‑limit Enrich, no
  auto‑enrich by default, freshness shown to avoid needless re‑enrichment. Clay
  50k table cap documented (rotate `clayWebhookUrl` or Enterprise passthrough).
- **Scoping.** Callback resolves workspace from `enrichment_runs.userId` (no
  session), then writes with `workspaceUserIdMatches(...)`. All reads scoped.
- **Privacy.** Enriched PII on the record; raw payloads on `enrichment_runs`
  retention‑capped; honor opt‑out. Disabling the module retains data (does not
  delete).

---

## 14. Explicitly NOT in Stage 1

Do not build: bidirectional table sync, automated outbound sequences, large Clay
prospecting lists, multiple enrichment providers, waterfall configuration,
enrichment workflow builders, bulk enrich, or any exposure of Clay's complexity.
Keep it: **Enable → Enrich → Understand → Recommend.**

---

## 15. Build breakdown (independently shippable slices)

Difficulty is characterized by which subsystems change, not calendar time.

- **1a — Module framework + billing (ship the toggleable paid shell first).**
  `workspace_addons` table + `lib/modules.ts` (`isModuleEnabled` / `requireModule`
  / `getModuleState`); `companyModel` on `workspace_settings` + onboarding default;
  `ADDONS` in `lib/billing/plans.ts`; `createAddonCheckout` / `cancelAddon`;
  Square webhook branching (`applyAddonSubscription`); Settings → Plan
  enable/cancel + upsell; conditional mounting so the module can be turned on/off
  with **no enrichment yet** (enabled state shows a "ready — configure your
  connection" panel). *Touches:* schema, migrations, billing action + webhook,
  plan UI, a client `useModuleEnabled` hook. **This is the riskiest/most valuable
  slice** and delivers the "off by default, enable with payment" requirement on
  its own.
- **1b — Enrich + callback loop.** `enrichContact` / `enrichCompany` (module +
  plan + quota gated), Clay submit, `enrichment_runs`, `POST /api/webhooks/clay`,
  Enrich buttons + pending state + activity + Settings → Intelligence config.
- **1c — Normalize + Score.** `normalize.ts` (→ system tags) + `fit-score.ts`
  wired into the callback.
- **1d — Explain.** `summary.ts` over `chatCompletion` with fallback.
- **1e — Feedback + card polish.** `enrichment_feedback` writes + one‑tap controls;
  finalize the intelligence card, discovery card, and quota display.

**Recommended first slice:** 1a (the paid, toggleable module shell) → then 1b for
the real Clay round‑trip → 1c → 1d → 1e, each visibly upgrading the same card.

**Testing.** Unit tests (vitest, matching `tests/`) for `modules`
(enable/expire/quota), `normalize`, `fit-score`, Square webhook add‑on branching,
and Clay callback correlation/idempotency; mocked Clay callback for the round‑trip;
manual before/after demo on a real record.

---

## 16. Stage 2 preview (natural next leap)

With the feedback dataset accumulating, the question flips from *"what can the
supplier tell me about this lead?"* to *"based on the customers we've actually
won, find more companies that look like them."* Normalized attributes + Fit Score
+ `enrichment_feedback` outcomes become the seed profile for lookalike discovery —
turning the module from a per‑record feature into a growth engine, and justifying
its MRR. The provider interface also leaves room for a **B2C / consumer
intelligence** module for the other half of Nula's customers.

---

## 17. Open decisions (need input before building)

1. **MRR price** for the add‑on and the **monthly enrichment credit** allowance.
2. **B2B/B2C detection** — add explicit `companyModel`, or infer purely from
   `businessType`? Default mapping for each vertical.
3. **Field mapping specifics** — exact Clay column names / HTTP‑API body → Nula
   normalized keys (depends on the Clay table built).
4. **Columns vs JSON** — confirm the promoted columns in §7.1.
5. **Fit‑score defaults** — starting weights and where ICP is configured.
6. **Shared vs per‑workspace Clay table** — env fallback for the demo vs.
   per‑workspace URL; and 50k‑cap handling.
7. **On disable** — confirm retain‑not‑delete, and grace access until period end.
8. **Company → contacts cascade** — does enriching a company backfill its linked
   contacts (or vice versa)?
9. **Auto‑enrich on intake** — keep off for Stage 1 (recommended) or opt‑in.
