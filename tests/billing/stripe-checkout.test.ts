import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const api = vi.hoisted(() => ({
  price: vi.fn(),
  list: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  expire: vi.fn(),
}))
vi.mock("stripe", () => ({
  default: class {
    prices = { retrieve: api.price }
    checkout = {
      sessions: { list: api.list, create: api.create, expire: api.expire },
    }
    subscriptions = { update: api.update }
  },
}))
import {
  cancelStripeSubscription,
  createSubscriptionCheckout,
} from "@/lib/stripe"
const params = {
  workspaceId: "ws_1",
  customerId: "cus_1",
  priceId: "price_1",
  amount: 2900,
  currency: "usd",
  interval: "month" as const,
  origin: "https://nula.example",
}
beforeEach(() => {
  vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_nula")
  vi.clearAllMocks()
  api.price.mockResolvedValue({
    active: true,
    type: "recurring",
    unit_amount: 2900,
    currency: "usd",
    recurring: { interval: "month", interval_count: 1 },
  })
  api.list.mockResolvedValue({ data: [] })
  api.create.mockResolvedValue({ url: "https://checkout.stripe.com/nula" })
})
afterEach(() => vi.unstubAllEnvs())
describe("Stripe checkout", () => {
  it("sets trusted workspace metadata on the session and subscription", async () => {
    await createSubscriptionCheckout(params)
    const metadata = {
      app: "nula-crm",
      workspaceId: "ws_1",
      kind: "base",
      priceId: "price_1",
    }
    expect(api.create).toHaveBeenCalledWith(
      expect.objectContaining({
        customer: "cus_1",
        mode: "subscription",
        metadata,
        subscription_data: { metadata },
        line_items: [{ price: "price_1", quantity: 1 }],
      }),
      expect.objectContaining({
        idempotencyKey: expect.stringContaining("ws_1:base:"),
      })
    )
  })
  it("rejects a price that would charge more than the displayed amount", async () => {
    api.price.mockResolvedValue({
      active: true,
      type: "recurring",
      unit_amount: 9900,
    })
    await expect(createSubscriptionCheckout(params)).rejects.toThrow(
      "does not match"
    )
    expect(api.create).not.toHaveBeenCalled()
  })
  it("reuses an open checkout scoped to this workspace and subscription kind", async () => {
    api.list.mockResolvedValue({
      data: [
        {
          url: "https://other.example",
          metadata: {
            app: "nula-crm",
            workspaceId: "ws_other",
            kind: "base",
            priceId: "price_1",
          },
        },
        {
          url: "https://checkout.stripe.com/existing",
          metadata: {
            app: "nula-crm",
            workspaceId: "ws_1",
            kind: "base",
            priceId: "price_1",
          },
        },
      ],
    })
    expect(await createSubscriptionCheckout(params)).toEqual({
      url: "https://checkout.stripe.com/existing",
    })
    expect(api.create).not.toHaveBeenCalled()
  })
  it("expires a checkout for a different billing interval before creating the selected plan", async () => {
    api.list.mockResolvedValue({
      data: [
        {
          id: "cs_annual",
          url: "https://checkout.stripe.com/annual",
          metadata: {
            app: "nula-crm",
            workspaceId: "ws_1",
            kind: "base",
            priceId: "price_annual",
          },
        },
      ],
    })
    await createSubscriptionCheckout(params)
    expect(api.expire).toHaveBeenCalledWith("cs_annual")
    expect(api.create).toHaveBeenCalled()
  })
  it("cancels at period end instead of ending paid access immediately", async () => {
    await cancelStripeSubscription("sub_1")
    expect(api.update).toHaveBeenCalledWith("sub_1", {
      cancel_at_period_end: true,
    })
  })
})
