# Stripe billing setup

Nula uses Stripe Checkout for recurring payments and the Stripe customer portal for payment methods, invoices, and cancellation. Pro and B2B Intelligence use separate subscriptions. The existing seven-day in-app trial remains in Nula; Checkout starts billing immediately when the owner subscribes.

## Account and prices

The live catalog was created on October 19, 2026 in the VS Marketing account, `acct_18MJlaIP2Iny9fxc`.

| Environment variable | Amount | Live Price ID |
| --- | --- | --- |
| `STRIPE_PRICE_PRO_MONTHLY` | USD 29/month | `price_1USKQAIP2Iny9fxc25v0WGti` |
| `STRIPE_PRICE_PRO_ANNUAL` | USD 290/year | `price_1USKRCIP2Iny9fxcGggiYIaE` |
| `STRIPE_PRICE_ADDON_B2B_INTEL_MONTHLY` | USD 49/month | `price_1USKRnIP2Iny9fxcP8BBTgyH` |
| `STRIPE_PRICE_ADDON_B2B_INTEL_ANNUAL` | USD 490/year | `price_1USKSfIP2Iny9fxc0XSbZpDn` |

Products: [Nula Pro](https://dashboard.stripe.com/acct_18MJlaIP2Iny9fxc/products/prod_VTGyGWQHhc9GUW) and [Nula B2B Intelligence](https://dashboard.stripe.com/acct_18MJlaIP2Iny9fxc/products/prod_VTGzdnKieZZl8F).

Create equivalent recurring prices in the account's test environment before testing. Test and live Price IDs, API keys, and webhook signing secrets must come from the same environment. Checkout validates the configured price's amount, currency, and recurrence against `lib/billing/plans.ts`.

## Server configuration

Configure `.env.local` for local development and the `nula-crm` Vercel project's environment variables for hosting:

- `DATABASE_URL`, `BETTER_AUTH_SECRET`, and the existing application configuration.
- `NEXT_PUBLIC_APP_URL` and `BETTER_AUTH_URL`: the application origin; production is `https://www.nulacrm.ai`.
- `STRIPE_SECRET_KEY`: server API key. Never use a `NEXT_PUBLIC_` prefix or commit the value.
- `STRIPE_WEBHOOK_SECRET`: signing secret for this specific endpoint or local Stripe CLI listener.
- The four Price IDs above, using test equivalents in development and preview environments.
- `STRIPE_AUTOMATIC_TAX`: defaults to `false`. Set to `true` after configuring Stripe Tax and applicable registrations. When enabled, Checkout collects a billing address and requests automatic tax calculation.

Billing requires both the server key and signing secret. Production cannot activate a paid plan or add-on through the development fallback, even when configuration is missing.

Run database migration `040_stripe_billing.sql` before using the changed app. `npm run db:migrate` requires environment variables explicitly loaded; for local configuration, use `node --env-file=.env.local scripts/migrate.mjs`. Production builds run migrations automatically when `DATABASE_URL` is set. In Vercel production builds, `scripts/verify-billing-cutover.mjs` then requires all billing variables, audits legacy subscription counts, and validates all four live Stripe prices. The build fails before promotion if any check fails.

## Webhook and customer portal

Register `https://www.nulacrm.ai/api/webhooks/stripe` in the same Stripe account and mode as the API key. Use the SDK's API version (`2026-09-30.endive` for Stripe Node 23.0.0), with a snapshot event destination. Subscribe to:

- `checkout.session.completed`
- `checkout.session.async_payment_succeeded`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.paid`
- `invoice.payment_failed`

The handler verifies Stripe's signature against the raw request body and rejects invalid signatures. It retrieves the latest subscription under a workspace lock, so duplicate or delayed events converge on current Stripe state. It requires Nula metadata, a recognized price, and an exact match with the workspace's stored Stripe customer. Unrelated subscriptions in the shared Stripe account are ignored.

Enable the customer portal in Stripe Billing settings. Allow invoice history, payment method updates, and cancellation at the end of the billing period. Leave subscription switching and quantity changes disabled: Nula currently supports one item with quantity one per subscription and identifies each product using its configured Price ID.

For local forwarding with the official Stripe CLI:

```sh
stripe listen --events checkout.session.completed,checkout.session.async_payment_succeeded,customer.subscription.created,customer.subscription.updated,customer.subscription.deleted,invoice.paid,invoice.payment_failed --forward-to localhost:3000/api/webhooks/stripe
```

Use that listener's signing secret locally. The hosted endpoint has a different signing secret.

## Existing subscriptions and cutover

Chargebee was only a proposed migration in this repository. The previous implemented provider was Square. This change removes Square checkout and its webhook handler, while retaining historical database columns for reconciliation. Migration 040 creates new Stripe columns without copying Square IDs or resetting existing plan and trial values.

Before deploying, audit existing Square subscriptions and agree on their billing transition. Accounts with a legacy Square subscription ID cannot start another subscription through Nula, which prevents accidental double billing. To migrate an account, coordinate the old subscription's cancellation or renewal boundary and the new Stripe payment authorization, then clear the reconciled legacy subscription ID. Never copy a Square customer or subscription ID into a Stripe field. If active Square subscriptions remain, keep the previous release until their migration is arranged; the new Stripe handler does not process their lifecycle events.

## Payment verification

Use a dedicated test workspace and Stripe test mode before enabling live checkout:

1. Subscribe to Pro monthly; verify the signed webhook sets only that workspace's base plan to active and records the Stripe customer, subscription, price, and period end.
2. Repeat with Pro annual on another test workspace. Confirm the displayed amount matches Checkout.
3. Add Intelligence monthly and annual on separate test workspaces; verify the base plan is unchanged and the add-on grants 250 monthly enrichment credits.
4. Open the customer portal and verify invoices and payment methods are available for the signed-in owner's workspace.
5. Schedule cancellation. Access continues until the period ends and the settings screen shows the scheduled end date.
6. Replay and reorder events, simulate payment failure and recovery, and verify an unpaid subscription loses paid access. `past_due` retains access while Stripe retries; `unpaid`, `incomplete`, `paused`, and ended subscriptions do not grant paid access.
7. Verify another workspace and unrelated Stripe products receive no entitlement changes. Confirm a second checkout is blocked while a subscription exists, including before the completion webhook arrives.

Automated checks: `npm test`, `npm run typecheck`, targeted ESLint on changed billing code, and `npm run build`. Database migration and end-to-end payment verification require the configured database, application auth, and Stripe test credentials.

Stripe references: [Checkout metadata](https://support.stripe.com/questions/using-metadata-with-checkout-sessions), [Checkout Sessions API](https://docs.stripe.com/api/checkout/sessions), and [subscription billing periods](https://support.stripe.com/questions/how-to-determine-when-a-subscription-cycles-using-webhooks).
