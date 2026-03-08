// ============================================================
// Tests — Query Helpers
// ============================================================
import { describe, it, expect, vi } from "vitest";
import {
  querySubscriptionByCustomer,
  querySubscriptionById,
  queryActiveSubscriptions,
  querySubscriptionsByProduct,
  queryPaymentsByCustomer,
  queryCustomerByEmail,
  queryHasActiveSubscription,
  queryWebhookEvents,
} from "../src/queries/index.js";

// Mock db that returns predictable data per query
function createQueryDb(tableData: Record<string, any[]> = {}) {
  return {
    query: vi.fn((table: string) => {
      const items = tableData[table] || [];
      return {
        withIndex: vi.fn((_idx: string, _fn: any) => ({
          unique: vi.fn(async () => items[0] ?? null),
          order: vi.fn((_dir: string) => ({
            first: vi.fn(async () => items[0] ?? null),
            collect: vi.fn(async () => items),
          })),
          collect: vi.fn(async () => items),
        })),
        order: vi.fn((_dir: string) => ({
          first: vi.fn(async () => items[0] ?? null),
          take: vi.fn(async (n: number) => items.slice(0, n)),
          collect: vi.fn(async () => items),
        })),
      };
    }),
  };
}

describe("Query Helpers", () => {
  describe("querySubscriptionByCustomer", () => {
    it("should return subscription for customer", async () => {
      const db = createQueryDb({ creem_subscriptions: [{ id: "sub_1", status: "active" }] });
      const result = await querySubscriptionByCustomer(db, "cust_1");
      expect(result).toEqual({ id: "sub_1", status: "active" });
      expect(db.query).toHaveBeenCalledWith("creem_subscriptions");
    });

    it("should return null when no subscription", async () => {
      const db = createQueryDb({});
      const result = await querySubscriptionByCustomer(db, "cust_missing");
      expect(result).toBeNull();
    });
  });

  describe("querySubscriptionById", () => {
    it("should return subscription by creem ID", async () => {
      const db = createQueryDb({ creem_subscriptions: [{ creemSubscriptionId: "sub_x" }] });
      const result = await querySubscriptionById(db, "sub_x");
      expect(result).toBeDefined();
    });
  });

  describe("queryActiveSubscriptions", () => {
    it("should query by status index", async () => {
      const subs = [
        { id: "sub_1", status: "active" },
        { id: "sub_2", status: "active" },
      ];
      const db = createQueryDb({ creem_subscriptions: subs });
      const result = await queryActiveSubscriptions(db);
      expect(result).toHaveLength(2);
    });
  });

  describe("querySubscriptionsByProduct", () => {
    it("should return subscriptions filtered by product", async () => {
      const db = createQueryDb({ creem_subscriptions: [{ creemProductId: "prod_1" }] });
      const result = await querySubscriptionsByProduct(db, "prod_1");
      expect(result).toHaveLength(1);
    });
  });

  describe("queryPaymentsByCustomer", () => {
    it("should return payments ordered desc", async () => {
      const payments = [
        { amount: 2900, creemCustomerId: "cust_1" },
        { amount: 4900, creemCustomerId: "cust_1" },
      ];
      const db = createQueryDb({ creem_payments: payments });
      const result = await queryPaymentsByCustomer(db, "cust_1");
      expect(result).toHaveLength(2);
    });
  });

  describe("queryCustomerByEmail", () => {
    it("should return customer by email", async () => {
      const db = createQueryDb({ creem_customers: [{ email: "manu@test.com" }] });
      const result = await queryCustomerByEmail(db, "manu@test.com");
      expect(result).toBeDefined();
      expect(result!.email).toBe("manu@test.com");
    });

    it("should return null for unknown email", async () => {
      const db = createQueryDb({});
      const result = await queryCustomerByEmail(db, "unknown@test.com");
      expect(result).toBeNull();
    });
  });

  describe("queryHasActiveSubscription", () => {
    it("should return hasAccess=true for active subscription", async () => {
      const db = createQueryDb({ creem_subscriptions: [{ status: "active" }] });
      const result = await queryHasActiveSubscription(db, "cust_1");
      expect(result.hasAccess).toBe(true);
      expect(result.status).toBe("active");
    });

    it("should return hasAccess=true for trialing", async () => {
      const db = createQueryDb({ creem_subscriptions: [{ status: "trialing" }] });
      const result = await queryHasActiveSubscription(db, "cust_1");
      expect(result.hasAccess).toBe(true);
    });

    it("should return hasAccess=false for canceled", async () => {
      const db = createQueryDb({ creem_subscriptions: [{ status: "canceled" }] });
      const result = await queryHasActiveSubscription(db, "cust_1");
      expect(result.hasAccess).toBe(false);
      expect(result.status).toBe("canceled");
    });

    it("should return hasAccess=false when no subscription", async () => {
      const db = createQueryDb({});
      const result = await queryHasActiveSubscription(db, "cust_missing");
      expect(result.hasAccess).toBe(false);
      expect(result.status).toBeNull();
      expect(result.subscription).toBeNull();
    });
  });

  describe("queryWebhookEvents", () => {
    it("should return events with limit", async () => {
      const events = Array.from({ length: 5 }, (_, i) => ({ id: `evt_${i}` }));
      const db = createQueryDb({ creem_webhook_events: events });
      const result = await queryWebhookEvents(db, 3);
      expect(result).toHaveLength(3);
    });

    it("should default to 50 limit", async () => {
      const db = createQueryDb({ creem_webhook_events: [] });
      await queryWebhookEvents(db);
      // Just verify it doesn't crash with default
      expect(db.query).toHaveBeenCalledWith("creem_webhook_events");
    });
  });
});
