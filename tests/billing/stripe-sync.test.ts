import { beforeEach, describe, expect, it, vi } from "vitest"
import type Stripe from "stripe"

const mocks = vi.hoisted(() => ({
  retrieve: vi.fn(),
  applyBase: vi.fn(),
  applyAddon: vi.fn(),
  transaction: vi.fn(),
}))
vi.mock("@/lib/stripe", () => ({
  getStripe: () => ({ subscriptions: { retrieve: mocks.retrieve } }),
}))
vi.mock("@/lib/db", () => ({ db: { transaction: mocks.transaction } }))
vi.mock("@/lib/billing/subscription", () => ({
  applySubscription: mocks.applyBase,
}))
vi.mock("@/lib/billing/addons", () => ({
  applyAddonSubscription: mocks.applyAddon,
}))
vi.mock("@/lib/billing/plans", () => ({
  planByPriceId: (id: string) =>
    id === "price_pro" ? { id: "pro" } : undefined,
  addonByPriceId: (id: string) =>
    id === "price_addon" ? { addonId: "b2b_intelligence" } : undefined,
}))
import {
  subscriptionTarget,
  syncStripeSubscription,
} from "@/lib/billing/stripe-sync"
function sub(overrides: Record<string, unknown> = {}) {
  return {
    id: "sub_1",
    customer: "cus_1",
    status: "active",
    cancel_at_period_end: false,
    metadata: { app: "nula-crm", workspaceId: "workspace_1", kind: "base" },
    items: {
      data: [
        {
          price: { id: "price_pro" },
          quantity: 1,
          current_period_end: 1800000000,
        },
      ],
      has_more: false,
    },
    ...overrides,
  } as unknown as Stripe.Subscription
}
const workspace = {
  workspaceId: "workspace_1",
  stripeCustomerId: "cus_1",
  stripeSubscriptionId: "",
}
function transaction(rows: object[]) {
  let index = 0
  const tx = {
    execute: vi.fn().mockResolvedValue(undefined),
    select: () => ({
      from: () => ({
        where: () => ({
          limit: async () => (rows[index++] ? [rows[index - 1]] : []),
        }),
      }),
    }),
  }
  mocks.transaction.mockImplementation(async (fn) => fn(tx))
  return tx
}
beforeEach(() => {
  vi.clearAllMocks()
  mocks.retrieve.mockReset().mockResolvedValue(sub())
  transaction([workspace])
})
describe("Stripe subscription synchronization", () => {
  it("ignores subscriptions belonging to other apps", async () => {
    mocks.retrieve.mockResolvedValue(sub({ metadata: {} }))
    await syncStripeSubscription("sub_1")
    expect(mocks.transaction).not.toHaveBeenCalled()
  })
  it("rejects an unknown price rather than treating it as the base plan", () => {
    expect(() =>
      subscriptionTarget(
        sub({
          items: { data: [{ price: { id: "price_unknown" }, quantity: 1 }] },
        })
      )
    ).toThrow()
  })
  it("rejects a customer mismatch", async () => {
    transaction([{ ...workspace, stripeCustomerId: "cus_other" }])
    await expect(syncStripeSubscription("sub_1")).rejects.toThrow(
      "customer does not match"
    )
    expect(mocks.applyBase).not.toHaveBeenCalled()
  })
  it("fetches latest state inside the lock instead of using the event snapshot", async () => {
    mocks.retrieve
      .mockResolvedValueOnce(sub())
      .mockResolvedValueOnce(sub({ status: "unpaid" }))
    await syncStripeSubscription("sub_1")
    expect(mocks.applyBase).toHaveBeenCalledWith(
      "workspace_1",
      expect.objectContaining({ status: "unpaid" }),
      expect.anything()
    )
  })
  it("routes add-ons separately and preserves cancellation scheduling", async () => {
    transaction([workspace, {}])
    mocks.retrieve.mockResolvedValue(
      sub({
        metadata: {
          app: "nula-crm",
          workspaceId: "workspace_1",
          kind: "addon",
          addonId: "b2b_intelligence",
        },
        items: {
          data: [
            {
              price: { id: "price_addon" },
              quantity: 1,
              current_period_end: 1800000000,
            },
          ],
        },
        cancel_at_period_end: true,
      })
    )
    await syncStripeSubscription("sub_1")
    expect(mocks.applyAddon).toHaveBeenCalledWith(
      "workspace_1",
      expect.objectContaining({ cancelAtPeriodEnd: true }),
      "",
      expect.anything()
    )
    expect(mocks.applyBase).not.toHaveBeenCalled()
  })
  it("does not let a late cancellation overwrite a replacement subscription", async () => {
    transaction([{ ...workspace, stripeSubscriptionId: "sub_new" }])
    mocks.retrieve.mockResolvedValue(sub({ status: "canceled" }))
    await syncStripeSubscription("sub_1")
    expect(mocks.applyBase).not.toHaveBeenCalled()
  })
  it("uses the actual end date when Stripe cancels early", async () => {
    mocks.retrieve.mockResolvedValue(
      sub({ status: "canceled", ended_at: 1700000000 })
    )
    await syncStripeSubscription("sub_1")
    expect(mocks.applyBase).toHaveBeenCalledWith(
      "workspace_1",
      expect.objectContaining({ currentPeriodEnd: new Date(1700000000000) }),
      expect.anything()
    )
  })
})
