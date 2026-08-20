# Square → Chargebee Migration Plan

Status: **Plan / proposal** (not yet implemented).
Goal: replace Square as the billing/subscription provider with **Chargebee** for
both the base **Nula Pro** plan and the **B2B Intelligence** add-on, with minimal
disruption to the existing entitlement model.

---

## 1. Why this is well-contained

All billing logic already lives behind a thin provider layer. Entitlement (who
has access) is decoupled from the provider (who charges the card):

- Base plan access is derived from `workspace_settings.plan` + `trialEndsAt`
  (`lib/trial.ts` / `lib/entitlements.ts`).
- Add-on access is derived from `workspace_addons.status` (`lib/modules.ts`).
- Only a small set of files actually talk to Square.

So the migration is mostly: swap the provider adapter, remap statuses/ids, replace
one webhook, and re-point the plan catalog at Chargebee price IDs.

---

## 2. Current Square touchpoints (what changes)

| File | Role today | Change |
|---|---|---|
| `lib/square.ts` | Square API client: checkout link, cancel, retrieve sub/customer, **HMAC** webhook verify, `resolvePlanVariationId`, `isBillingConfigured` | **Replace** with `lib/chargebee.ts` |
| `app/api/webhooks/square/route.ts` | Square webhook (`subscription.created/updated`, `invoice.payment_made`); branches base vs add-on by `plan_variation_id` | **Replace** with `app/api/webhooks/chargebee/route.ts` |
| `lib/billing/plans.ts` | `PLANS` + `ADDONS` catalogs; `priceId` = Square plan-variation id from env; `planByPriceId` / `addonByPriceId` | Re-point `priceId` → Chargebee **item price id**; env var rename |
| `lib/billing/subscription.ts` | `applySubscription` / `clearSubscription` / `findWorkspaceByCustomer` (base plan on `workspace_settings`) | Keep shape; adapt status set + id fields |
| `lib/billing/addons.ts` | `applyAddonSubscription` / `clearAddonSubscription` / `setAddonComp` / `enableAddonLocally` (add-on on `workspace_addons`) | Keep shape; adapt status set + id fields |
| `app/actions/billing.ts` | `createCheckout`, `cancelSubscription`, `getBillingState`, `createAddonCheckout`, `cancelAddon`, `enableAddonNow`, `getAddonState` | Point checkout/cancel at Chargebee hosted pages + portal |
| `lib/db/schema.ts` + migration | `workspace_settings.square*` + `workspace_addons.square*` columns | Rename to provider-neutral (migration) — see §5 |
| `components/settings/plan-settings.tsx` | Subscribe/cancel UI; “once Square is connected” copy | Copy tweaks; optional “Manage billing” (portal) button |
| `components/settings/intelligence-plan-card.tsx` | Add-on subscribe/cancel; “once Square is connected” copy | Copy tweaks |
| `app/(marketing)/terms/page.tsx`, `privacy/page.tsx` | “Payments are processed by Square” | Change processor name to Chargebee |
| `.env.example` | `SQUARE_*` vars | Replace with `CHARGEBEE_*` |
| `app/actions/workspace.ts` (`activatePlan`), `app/actions/admin.ts` (`setAccountPlan`), `lib/billing/addons.ts` (`enableAddonLocally`, `setAddonComp`) | Dev/no-billing fallback + super-admin comp | **No change** — provider-independent |

> `activity-feed.tsx`, `ui/avatar.tsx`, `ui/sidebar.tsx`, `ui/calendar.tsx` match
> “square” only via the Lucide icon / `aspect-square` CSS — **not billing**.

---

## 3. Concept mapping: Square → Chargebee

| Square | Chargebee | Notes |
|---|---|---|
| Plan **variation** id | **Item Price** id (Product Catalog 2.0) | Stable id; no `resolvePlanVariationId` step needed |
| Customer id | Customer id | Set a `cf_workspace_id` custom field so the webhook can resolve the Nula workspace directly |
| Subscription id | Subscription id | |
| Payment link (`/online-checkout/payment-links`) | **Hosted Checkout** page (`hosted_page.checkout_new_for_items`) | Redirect to `hosted_page.url`; `redirect_url` returns to `/app/settings?tab=plan&checkout=success` |
| `cancelSquareSubscription` | `subscription.cancel_for_items` (end of term) **or** Customer Portal | Recommend adopting the **Customer Portal** for self-serve manage/cancel/update-card |
| Webhook **HMAC** (`x-square-hmacsha256-signature`) | Webhook **Basic Auth** (username/password) + optional IP allowlist | Verification mechanism differs — no HMAC |
| Statuses `ACTIVE/PENDING/PAUSED/CANCELED/DEACTIVATED` | `active`, `in_trial`, `non_renewing`, `paused`, `cancelled`, `future` | Remap “active” set (see §4) |
| Events `subscription.created/updated`, `invoice.payment_made` | `subscription_created/activated/changed/renewed/cancelled/deleted`, `payment_succeeded/failed` | |

**Base vs add-on routing:** Chargebee subscriptions carry
`subscription_items[].item_price_id`. Two options:

- **Option A (recommended, 1:1 with today):** keep **separate subscriptions** per
  product — one for Nula Pro, one for B2B Intelligence. The webhook branches by
  matching `item_price_id` against `PLANS` vs `ADDONS`, exactly like the current
  Square `plan_variation_id` branch. Lowest churn to the two-record model
  (`workspace_settings` for base, `workspace_addons` for add-on).
- **Option B (more Chargebee-idiomatic):** one subscription with multiple items
  (plan + addon). The webhook then updates **both** records from a single event.
  More elegant, but requires the webhook handler to reconcile multiple entitlements
  per event. Defer unless we want combined invoices.

---

## 4. App changes (implementation outline)

1. **Add `lib/chargebee.ts`** (new provider adapter):
   - `isBillingConfigured()` → `CHARGEBEE_SITE` + `CHARGEBEE_API_KEY` present.
   - `createCheckout({ itemPriceId, email, workspaceId, redirectUrl })` → hosted
     page URL (sets `customer.cf_workspace_id`).
   - `createPortalSession(customerId, redirectUrl)` → portal `access_url`.
   - `retrieveSubscription(id)`, `cancelSubscription(id, { endOfTerm })`.
   - `verifyWebhookBasicAuth(req)` (replaces HMAC verify).
   - `toState(sub)` → the existing `SubscriptionState` shape
     (`subscriptionId, customerId, status, planVariationId→itemPriceId, currentPeriodEnd`).
   - Uses the official **Chargebee Node SDK**.
2. **`lib/billing/plans.ts`** — set `priceId` from Chargebee item price envs
   (`CHARGEBEE_PLAN_PRO_MONTHLY`, `_ANNUAL`, `CHARGEBEE_ADDON_B2B_INTEL_MONTHLY`,
   `_ANNUAL`). `Plan`/`Addon` shapes and `planByPriceId`/`addonByPriceId` stay.
3. **Status mapping** — update the “active” sets:
   - `lib/billing/subscription.ts` `ACTIVE_STATUSES` and `lib/billing/addons.ts`
     `ACTIVE_STATUSES` → `{ active, in_trial, non_renewing }`.
   - `lib/modules.ts` `isActiveStatus` → treat `active`/`in_trial`/`non_renewing`
     (+ existing `comped`) as enabled; `cancelled`/`paused` not (respect
     `currentPeriodEnd` grace for `non_renewing`).
   - `app/actions/admin.ts` `getAccounts` has an inline copy of the active-status
     check — update it too.
4. **`app/actions/billing.ts`** — `createCheckout` / `createAddonCheckout` call the
   Chargebee adapter; `cancelSubscription` / `cancelAddon` call Chargebee cancel
   (or open the portal). Add `createBillingPortalSession()`. `getBillingState` /
   `getAddonState` are unchanged (they read workspace columns).
5. **`app/api/webhooks/chargebee/route.ts`** (new) — verify Basic Auth; on
   `subscription_*` / `payment_succeeded`, resolve workspace via
   `content.customer.cf_workspace_id` (fallback: customer email → owner), branch
   base vs add-on by `item_price_id`, and call the existing
   `applySubscription` / `applyAddonSubscription` / `clear*` helpers. Delete the
   Square route.
6. **UI copy** — `plan-settings.tsx` / `intelligence-plan-card.tsx`: replace “once
   Square is connected” hints; add an optional **“Manage billing”** button that
   opens the Chargebee portal.
7. **Legal/marketing** — change “Square” → “Chargebee” in `terms` and any pricing
   copy that names the processor.
8. **Remove Square** — delete `lib/square.ts`, the Square webhook route, and all
   `SQUARE_*` env usage.
9. **Tests** — add unit tests for the new status mapping + webhook workspace
   resolution + base/add-on branching (mirrors the existing billing tests).

---

## 5. Schema (provider-neutral rename)

The columns are named `square*`. Recommended migration (idempotent) to keep them
honest and provider-agnostic going forward:

- `workspace_settings`: `squareCustomerId → billingCustomerId`,
  `squareSubscriptionId → billingSubscriptionId` (keep `subscriptionStatus`,
  `priceId`, `currentPeriodEnd`, `plan`, `trialEndsAt`).
- `workspace_addons`: `squareCustomerId → billingCustomerId`,
  `squareSubscriptionId → billingSubscriptionId`.

Update `lib/db/schema.ts`, mappers, and the billing helpers accordingly.
**Low-risk alternative:** reuse the existing `square*` columns as-is (store
Chargebee ids in them) to avoid a migration — functional but misleadingly named.

---

## 6. Existing-customer & payment migration (operational)

This is the riskiest part and is **not** just code:

1. **Payment gateway.** Chargebee is a billing layer on top of a gateway. **Square
   is not a Chargebee-supported gateway**, so we must connect a gateway in
   Chargebee (e.g. **Stripe**, **Chargebee Payments/BillingPay**, Braintree, etc.).
2. **Card/vault migration.** Cards stored in Square’s vault cannot be reused by a
   different gateway. Options: (a) Chargebee-assisted **secure card import** into
   the new gateway (gateway-dependent, may require a PCI card-transfer request), or
   (b) ask existing customers to re-enter their card via the portal.
3. **Subscription import.** Recreate active customers + subscriptions in Chargebee
   using **import/migration mode** (imports without immediately charging; preserves
   next-renewal dates). Map each to its Nula workspace via `cf_workspace_id`.
4. **Grandfathering.** Simplest cutover: let existing Square subscriptions run
   until their next renewal, create the Chargebee subscription to take over at that
   date, and stop new Square signups immediately.
5. **Reconciliation.** Backfill `billingCustomerId` / `billingSubscriptionId` for
   migrated accounts; verify entitlement parity (nobody loses access at cutover).

Because so few customers exist today, grandfather-until-renewal + re-enter-card via
portal is likely the lowest-risk path.

---

## 7. New environment variables

Add (and remove all `SQUARE_*`):

```
CHARGEBEE_SITE=                     # your-site (test: your-site-test)
CHARGEBEE_API_KEY=                  # full-access API key (server-side)
CHARGEBEE_WEBHOOK_USERNAME=         # Basic Auth for the webhook endpoint
CHARGEBEE_WEBHOOK_PASSWORD=
CHARGEBEE_PLAN_PRO_MONTHLY=         # item price id
CHARGEBEE_PLAN_PRO_ANNUAL=
CHARGEBEE_ADDON_B2B_INTEL_MONTHLY=  # item price id
CHARGEBEE_ADDON_B2B_INTEL_ANNUAL=
```

Unchanged: `NEXT_PUBLIC_APP_URL` / `BETTER_AUTH_URL` (checkout/portal redirects),
`CLAY_*`, `RESEND_*`, `AI_*`.

---

## 8. What to set up in Chargebee (checklist)

**Account & gateway**
- [ ] Create a Chargebee **site** — one **Test** site and one **Live/Production** site.
- [ ] Connect a **payment gateway** (Stripe / Chargebee Payments / Braintree). *(Square is not a Chargebee gateway.)*
- [ ] Set base **currency = USD** and configure the billing entity / business profile (name, address on invoices).

**Product Catalog 2.0**
- [ ] Create a **Product Family** (e.g. “Nula”).
- [ ] Create Plan item **“Nula Pro”** with two **Item Prices**:
      - `pro-monthly` — **$29 / month**
      - `pro-annual` — **$290 / year**
- [ ] Create the **B2B Intelligence** add-on with two Item Prices:
      - monthly — **$49 / month**
      - annual — **$490 / year** *(mirror base annual discount)*
      - As an **Addon**-type item if using one subscription (Option B), or a second **Plan** if using separate subscriptions (Option A, recommended).
- [ ] **Turn off Chargebee trials** on all plans (Nula manages its own 7-day trial in-app), or set trial = 0 days.
- [ ] Record every **Item Price ID** → the `CHARGEBEE_*` env vars above.

**Checkout, Portal, Tax**
- [ ] Enable **Hosted Checkout / Payment Pages**; add `https://www.nulacrm.ai` (and any preview domains) to **allowed redirect/domain** list.
- [ ] Enable and brand the **Customer Portal**; allow: update payment method, cancel, change plan, view invoices. Set portal **return URL** to `https://www.nulacrm.ai/app/settings?tab=plan`.
- [ ] Configure **Taxes** (Chargebee Taxes or Avalara) since pricing is “plus applicable taxes”.
- [ ] Configure **dunning / retry** settings for failed payments.

**API, webhooks, custom fields**
- [ ] Create a **full-access API key** (server) for the app — store as `CHARGEBEE_API_KEY`.
- [ ] Add a **Customer custom field** `cf_workspace_id` (so webhooks map back to a Nula workspace).
- [ ] Add a **Webhook**: URL `https://www.nulacrm.ai/api/webhooks/chargebee`, **Basic Auth** username/password (→ `CHARGEBEE_WEBHOOK_USERNAME`/`PASSWORD`), events:
      `subscription_created`, `subscription_activated`, `subscription_changed`, `subscription_renewed`, `subscription_cancelled`, `subscription_deleted`, `payment_succeeded`, `payment_failed`.
- [ ] (Optional) restrict the webhook to Chargebee **IP ranges**.
- [ ] Decide on **email notifications**: disable Chargebee’s customer emails if Nula/Resend sends its own, or enable Chargebee’s.

**Migration (if moving live customers)**
- [ ] Enable **import/migration mode**; import existing customers + subscriptions with their next-renewal dates, tagging each with `cf_workspace_id`.
- [ ] Arrange **card migration** to the new gateway (secure import) or plan a re-enter-card flow via the portal.

---

## 9. Suggested rollout

1. **Test site first:** implement `lib/chargebee.ts` + the webhook against the
   Chargebee **Test** site; verify checkout → webhook → entitlement end-to-end in
   dev (the app’s no-billing/dev fallback keeps working throughout).
2. **Schema rename** migration + status mapping.
3. **Swap UI copy**, add the portal button, update legal pages.
4. **Cutover:** connect the Live site, set prod env vars, stop new Square signups,
   grandfather existing Square subs until renewal, then remove `lib/square.ts` and
   `SQUARE_*`.
