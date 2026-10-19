import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import Stripe from "stripe"
import { NextRequest } from "next/server"

const sync = vi.hoisted(() => vi.fn())
vi.mock("@/lib/billing/stripe-sync", () => ({ syncStripeSubscription: sync }))
import { POST } from "@/app/api/webhooks/stripe/route"

const secret = "whsec_nula_test"
const stripe = new Stripe("sk_test_nula")
function request(payload: string, signed = true) {
  return new NextRequest("https://nula.example/api/webhooks/stripe", {
    method: "POST",
    body: payload,
    headers: signed
      ? {
          "stripe-signature": stripe.webhooks.generateTestHeaderString({
            payload,
            secret,
          }),
        }
      : {},
  })
}
function event(type: string, object: object) {
  return JSON.stringify({
    id: "evt_test",
    object: "event",
    type,
    data: { object },
  })
}
beforeEach(() => {
  vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_nula")
  vi.stubEnv("STRIPE_WEBHOOK_SECRET", secret)
  sync.mockReset().mockResolvedValue(undefined)
})
afterEach(() => vi.unstubAllEnvs())

describe("Stripe webhook", () => {
  it("rejects unsigned and tampered requests without changing entitlements", async () => {
    expect(
      (
        await POST(
          request(
            event("customer.subscription.created", { id: "sub_1" }),
            false
          )
        )
      ).status
    ).toBe(400)
    const payload = event("customer.subscription.created", { id: "sub_1" })
    const signature = stripe.webhooks.generateTestHeaderString({
      payload,
      secret,
    })
    const tampered = new NextRequest(
      "https://nula.example/api/webhooks/stripe",
      {
        method: "POST",
        body: payload.replace("sub_1", "sub_2"),
        headers: { "stripe-signature": signature },
      }
    )
    expect((await POST(tampered)).status).toBe(400)
    expect(sync).not.toHaveBeenCalled()
  })
  it.each([
    "customer.subscription.created",
    "customer.subscription.updated",
    "customer.subscription.deleted",
  ])("synchronizes %s", async (type) => {
    expect((await POST(request(event(type, { id: "sub_1" })))).status).toBe(200)
    expect(sync).toHaveBeenCalledWith("sub_1")
  })
  it.each(["invoice.paid", "invoice.payment_failed"])(
    "resyncs subscriptions on %s",
    async (type) => {
      const payload = event(type, {
        parent: { subscription_details: { subscription: "sub_invoice" } },
      })
      expect((await POST(request(payload))).status).toBe(200)
      expect(sync).toHaveBeenCalledWith("sub_invoice")
    }
  )
  it("ignores unrelated checkouts in the shared Stripe account", async () => {
    await POST(
      request(
        event("checkout.session.completed", {
          subscription: "sub_other",
          metadata: {},
        })
      )
    )
    expect(sync).not.toHaveBeenCalled()
  })
  it("returns a retryable error when persistence fails", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {})
    sync.mockRejectedValue(new Error("DB unavailable"))
    expect(
      (
        await POST(
          request(event("customer.subscription.updated", { id: "sub_1" }))
        )
      ).status
    ).toBe(500)
    consoleSpy.mockRestore()
  })
  it("fails closed when configuration is missing", async () => {
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", "")
    expect((await POST(request("{}"))).status).toBe(503)
    expect(sync).not.toHaveBeenCalled()
  })
})
