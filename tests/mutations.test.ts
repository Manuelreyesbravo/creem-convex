// ============================================================
// Tests — Mutation Helpers (syncCheckoutToDb, upsertCustomer, etc.)
// ============================================================
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  syncCheckoutToDb,
  syncSubscriptionToDb,
  upsertCustomer,
  upsertSubscription,
  logWebhookEvent,
} from "../src/mutations/index.js";
import type { CreemCheckout, CreemCustomer, CreemSubscription } from "../src/types/index.js";

// Mock Convex db
function createMockDb() {
  const store: Record<string, any[]> = {};
  const patches: Array<{ id: string; data: any }> = [];

  const db = {
    insert: vi.fn(async (table: string, data: any) => {
      if (!store[table]) store[table] = [];
      const id = `id_${store[table].length}`;
      store[table].push({ _id: id, ...data });
      return id;
    }),
    patch: vi.fn(async (id: string, data: any) => {
      patches.push({ id, data });
    }),
    query: vi.fn((table: string) => {
      const items = store[table] || [];
      return {
        withIndex: vi.fn((_idx: string, fn: (q: any) => any) => {
          const q = { eq: (_field: string, value: any) => value };
          const filterValue = fn(q);
          return {
            unique: vi.fn(async () => {
              // Find match by checking all fields
              return items.find((item) =>
                Object.values(item).includes(filterValue)
              ) ?? null;
            }),
            order: vi.fn(() => ({
              first: vi.fn(async () => items[0] ?? null),
              collect: vi.fn(async () => items),
            })),
          };
        }),
        order: vi.fn(() => ({
          first: vi.fn(async () => items[0] ?? null),
          take: vi.fn(async (n: number) => items.slice(0, n)),
          collect: vi.fn(async () => items),
        })),
      };
    }),
    _store: store,
    _patches: patches,
  };
  return db;
}

const mockCustomer: CreemCustomer = {
  id: "cust_abc",
  object: "customer",
  email: "manu@latamflows.com",
  name: "Manuel Reyes",
  country: "CL",
  created_at: "2025-01-01T00:00:00Z",
  updated_at: "2025-01-01T00:00:00Z",
  mode: "live",
};

const mockSubscription: CreemSubscription = {
  id: "sub_123",
  object: "subscription",
  product: "prod_abc",
  customer: mockCustomer,
  collection_method: "charge_automatically",
  status: "active",
  current_period_start_date: "2025-02-01T00:00:00Z",
  current_period_end_date: "2025-03-01T00:00:00Z",
  canceled_at: null,
  created_at: "2025-01-15T00:00:00Z",
  updated_at: "2025-02-01T00:00:00Z",
  mode: "live",
};

const mockCheckout: CreemCheckout = {
  id: "chk_xyz",
  object: "checkout",
  status: "completed",
  mode: "live",
  order: {
    id: "ord_001",
    customer: "cust_abc",
    product: "prod_abc",
    amount: 2900,
    currency: "USD",
    status: "paid",
    type: "recurring",
    created_at: "2025-02-01T00:00:00Z",
    updated_at: "2025-02-01T00:00:00Z",
    mode: "live",
  },
  customer: mockCustomer,
  product: {
    id: "prod_abc",
    name: "Pro Plan",
    description: null,
    image_url: null,
    price: 2900,
    currency: "USD",
    billing_type: "recurring",
    billing_period: "every-month",
    status: "active",
    tax_mode: "inclusive",
    tax_category: "digital",
    default_success_url: "https://app.com/success",
    created_at: "2025-01-01T00:00:00Z",
    updated_at: "2025-01-01T00:00:00Z",
    mode: "live",
  },
  subscription: mockSubscription,
};

describe("Mutation Helpers", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
  });

  describe("upsertCustomer", () => {
    it("should insert new customer", async () => {
      await upsertCustomer(db, mockCustomer);
      expect(db.insert).toHaveBeenCalledWith("creem_customers", {
        creemCustomerId: "cust_abc",
        email: "manu@latamflows.com",
        name: "Manuel Reyes",
        country: "CL",
        creemCreatedAt: "2025-01-01T00:00:00Z",
      });
    });

    it("should patch existing customer", async () => {
      // Pre-populate store
      db._store["creem_customers"] = [{ _id: "id_0", creemCustomerId: "cust_abc" }];
      await upsertCustomer(db, mockCustomer);
      expect(db.patch).toHaveBeenCalledWith("id_0", expect.objectContaining({
        creemCustomerId: "cust_abc",
        email: "manu@latamflows.com",
      }));
    });
  });

  describe("upsertSubscription", () => {
    it("should insert new subscription", async () => {
      await upsertSubscription(db, mockSubscription, mockCustomer);
      expect(db.insert).toHaveBeenCalledWith("creem_subscriptions", expect.objectContaining({
        creemSubscriptionId: "sub_123",
        creemCustomerId: "cust_abc",
        creemProductId: "prod_abc",
        status: "active",
      }));
    });

    it("should handle string product/customer refs", async () => {
      const sub = { ...mockSubscription, product: "prod_xyz", customer: "cust_xyz" };
      await upsertSubscription(db, sub, null);
      expect(db.insert).toHaveBeenCalledWith("creem_subscriptions", expect.objectContaining({
        creemProductId: "prod_xyz",
        creemCustomerId: "cust_xyz",
      }));
    });
  });

  describe("syncCheckoutToDb", () => {
    it("should insert payment and upsert customer", async () => {
      await syncCheckoutToDb(db, mockCheckout);
      // Customer upserted
      expect(db.insert).toHaveBeenCalledWith("creem_customers", expect.objectContaining({
        creemCustomerId: "cust_abc",
      }));
      // Payment inserted
      expect(db.insert).toHaveBeenCalledWith("creem_payments", expect.objectContaining({
        creemCheckoutId: "chk_xyz",
        amount: 2900,
        currency: "USD",
        status: "paid",
      }));
    });

    it("should sync subscription if present", async () => {
      await syncCheckoutToDb(db, mockCheckout);
      expect(db.insert).toHaveBeenCalledWith("creem_subscriptions", expect.objectContaining({
        creemSubscriptionId: "sub_123",
      }));
    });

    it("should handle checkout without customer", async () => {
      const noCustomer = { ...mockCheckout, customer: undefined };
      await syncCheckoutToDb(db, noCustomer);
      // Should still insert payment without crashing
      expect(db.insert).toHaveBeenCalledWith("creem_payments", expect.objectContaining({
        creemCheckoutId: "chk_xyz",
      }));
    });

    it("should handle checkout without subscription", async () => {
      const noSub = { ...mockCheckout, subscription: undefined };
      await syncCheckoutToDb(db, noSub);
      // No subscription insert
      const subCalls = db.insert.mock.calls.filter((c: any[]) => c[0] === "creem_subscriptions");
      expect(subCalls).toHaveLength(0);
    });
  });

  describe("syncSubscriptionToDb", () => {
    it("should extract customer from object", async () => {
      await syncSubscriptionToDb(db, mockSubscription);
      expect(db.insert).toHaveBeenCalledWith("creem_subscriptions", expect.objectContaining({
        creemCustomerId: "cust_abc",
        customerEmail: "manu@latamflows.com",
      }));
    });

    it("should handle string customer ref", async () => {
      const sub = { ...mockSubscription, customer: "cust_string" };
      await syncSubscriptionToDb(db, sub);
      expect(db.insert).toHaveBeenCalledWith("creem_subscriptions", expect.objectContaining({
        creemCustomerId: "cust_string",
      }));
    });
  });

  describe("logWebhookEvent", () => {
    it("should insert new event", async () => {
      const id = await logWebhookEvent(db, "evt_1", "checkout.completed", { test: true }, Date.now());
      expect(db.insert).toHaveBeenCalledWith("creem_webhook_events", expect.objectContaining({
        creemEventId: "evt_1",
        eventType: "checkout.completed",
        processed: true,
      }));
      expect(id).toBeDefined();
    });

    it("should be idempotent - skip duplicate events", async () => {
      db._store["creem_webhook_events"] = [{ _id: "id_existing", creemEventId: "evt_dup" }];
      const id = await logWebhookEvent(db, "evt_dup", "checkout.completed", {}, Date.now());
      expect(db.insert).not.toHaveBeenCalled();
      expect(id).toBe("id_existing");
    });
  });
});
