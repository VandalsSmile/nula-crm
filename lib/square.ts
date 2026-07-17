import "server-only"

import { createHmac, randomUUID, timingSafeEqual } from "node:crypto"

const SQUARE_VERSION = process.env.SQUARE_VERSION?.trim() || "2025-01-23"

export function isBillingConfigured(): boolean {
  return Boolean(process.env.SQUARE_ACCESS_TOKEN?.trim() && process.env.SQUARE_LOCATION_ID?.trim())
}

function squareBaseUrl(): string {
  const env = process.env.SQUARE_ENV?.trim().toLowerCase()
  return env === "production"
    ? "https://connect.squareup.com"
    : "https://connect.squareupsandbox.com"
}

async function squareFetch<T>(
  path: string,
  init: { method?: string; body?: unknown } = {},
): Promise<T> {
  const token = process.env.SQUARE_ACCESS_TOKEN?.trim()
  if (!token) throw new Error("Square is not configured.")
  const res = await fetch(`${squareBaseUrl()}${path}`, {
    method: init.method ?? "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "Square-Version": SQUARE_VERSION,
    },
    body: init.body ? JSON.stringify(init.body) : undefined,
  })
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>
  if (!res.ok) {
    const errors = data.errors as Array<{ detail?: string }> | undefined
    throw new Error(errors?.[0]?.detail || `Square API error (${res.status})`)
  }
  return data as T
}

/**
 * Create a Square-hosted checkout page for a subscription plan variation.
 * See docs/checkout-api/subscription-plan-checkout — the subscription is created
 * automatically when the buyer pays.
 */
export async function createSubscriptionPaymentLink(params: {
  planVariationId: string
  amountCents: number
  planName: string
  buyerEmail?: string
  redirectUrl: string
  referenceId?: string
}): Promise<{ url: string; orderId: string }> {
  const locationId = process.env.SQUARE_LOCATION_ID?.trim()
  if (!locationId) throw new Error("Square is not configured.")

  const data = await squareFetch<{
    payment_link?: { url?: string; order_id?: string }
  }>("/v2/online-checkout/payment-links", {
    method: "POST",
    body: {
      idempotency_key: randomUUID(),
      quick_pay: {
        name: params.planName,
        price_money: { amount: params.amountCents, currency: "USD" },
        location_id: locationId,
      },
      checkout_options: {
        subscription_plan_id: params.planVariationId,
        redirect_url: params.redirectUrl,
      },
      ...(params.buyerEmail
        ? { pre_populated_data: { buyer_email: params.buyerEmail } }
        : {}),
      ...(params.referenceId ? { payment_note: params.referenceId } : {}),
    },
  })

  const url = data.payment_link?.url
  if (!url) throw new Error("Square did not return a checkout URL.")
  return { url, orderId: data.payment_link?.order_id ?? "" }
}

export type SquareSubscription = {
  id: string
  status: string
  customer_id?: string
  plan_variation_id?: string
  charged_through_date?: string
  canceled_date?: string
}

export async function retrieveSubscription(id: string): Promise<SquareSubscription | null> {
  if (!id) return null
  const data = await squareFetch<{ subscription?: SquareSubscription }>(`/v2/subscriptions/${id}`)
  return data.subscription ?? null
}

export async function retrieveCustomerEmail(customerId: string): Promise<string> {
  if (!customerId) return ""
  try {
    const data = await squareFetch<{ customer?: { email_address?: string } }>(
      `/v2/customers/${customerId}`,
    )
    return data.customer?.email_address?.trim().toLowerCase() ?? ""
  } catch {
    return ""
  }
}

export async function cancelSquareSubscription(id: string): Promise<void> {
  if (!id) throw new Error("No subscription to cancel.")
  await squareFetch(`/v2/subscriptions/${id}/cancel`, { method: "POST" })
}

/**
 * Verify a Square webhook signature. Square signs
 * base64(HMAC-SHA256(signatureKey, notificationUrl + rawBody)).
 */
export function verifySquareSignature(rawBody: string, signature: string, notificationUrl: string): boolean {
  const key = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY?.trim()
  if (!key || !signature) return false
  const expected = createHmac("sha256", key).update(notificationUrl + rawBody).digest("base64")
  const a = Buffer.from(expected)
  const b = Buffer.from(signature)
  return a.length === b.length && timingSafeEqual(a, b)
}
