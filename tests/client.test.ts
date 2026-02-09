// ============================================================
// Tests — CreemClient
// ============================================================
import { describe, it, expect, vi, beforeEach } from "vitest";
import { CreemClient, CreemApiError } from "../src/client.js";

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("CreemClient", () => {
  let client: CreemClient;
  let testClient: CreemClient;

  beforeEach(() => {
    mockFetch.mockReset();
    client = new CreemClient({ apiKey: "creem_live_key" });
    testClient = new CreemClient({ apiKey: "creem_test_key", testMode: true });
  });

  describe("constructor", () => {
    it("should use production URL by default", async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({ id: "prod_1" }));
      await client.getProduct("prod_1");
      expect(mockFetch.mock.calls[0][0]).toContain("https://api.creem.io");
    });

    it("should use test URL when testMode is true", async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({ id: "prod_1" }));
      await testClient.getProduct("prod_1");
      expect(mockFetch.mock.calls[0][0]).toContain("https://test-api.creem.io");
    });

    it("should send x-api-key header", async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({ id: "prod_1" }));
      await client.getProduct("prod_1");
      const headers = mockFetch.mock.calls[0][1].headers;
      expect(headers["x-api-key"]).toBe("creem_live_key");
    });
  });

  describe("Products", () => {
    it("getProduct should call correct endpoint", async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({ id: "prod_abc", name: "Template" }));
      const result = await client.getProduct("prod_abc");
      expect(mockFetch.mock.calls[0][0]).toBe("https://api.creem.io/v1/products?id=prod_abc");
      expect(result.id).toBe("prod_abc");
    });

    it("listProducts should use pagination params", async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({ items: [], total_count: 0, page: 2, page_size: 5 }));
      await client.listProducts(2, 5);
      expect(mockFetch.mock.calls[0][0]).toBe("https://api.creem.io/v1/products/search?page=2&limit=5");
    });

    it("createProduct should POST with correct body", async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({ id: "prod_new" }));
      await client.createProduct({ name: "Pro Plan", price: 2900, billingType: "recurring", billingPeriod: "every-month" });
      const opts = mockFetch.mock.calls[0][1];
      expect(opts.method).toBe("POST");
      const body = JSON.parse(opts.body);
      expect(body.name).toBe("Pro Plan");
      expect(body.billing_type).toBe("recurring");
      expect(body.currency).toBe("USD");
    });
  });

  describe("Checkouts", () => {
    it("createCheckout should POST with mapped fields", async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({ id: "chk_1", checkout_url: "https://pay.creem.io/chk_1" }));
      await client.createCheckout({ productId: "prod_1", successUrl: "https://app.com/success", metadata: { plan: "pro" } });
      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.product_id).toBe("prod_1");
      expect(body.success_url).toBe("https://app.com/success");
      expect(body.metadata.plan).toBe("pro");
    });

    it("getCheckout should call correct endpoint", async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({ id: "chk_1", status: "completed" }));
      const result = await client.getCheckout("chk_1");
      expect(mockFetch.mock.calls[0][0]).toContain("/v1/checkouts?id=chk_1");
      expect(result.status).toBe("completed");
    });
  });

  describe("Subscriptions", () => {
    it("getSubscription should call correct endpoint", async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({ id: "sub_1", status: "active" }));
      const result = await client.getSubscription("sub_1");
      expect(mockFetch.mock.calls[0][0]).toContain("/v1/subscriptions?id=sub_1");
      expect(result.status).toBe("active");
    });

    it("cancelSubscription should POST", async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({ id: "sub_1", status: "canceled" }));
      await client.cancelSubscription("sub_1");
      expect(mockFetch.mock.calls[0][1].method).toBe("POST");
      expect(mockFetch.mock.calls[0][0]).toContain("/subscriptions/sub_1/cancel");
    });

    it("pauseSubscription should POST", async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({ id: "sub_1", status: "paused" }));
      await client.pauseSubscription("sub_1");
      expect(mockFetch.mock.calls[0][0]).toContain("/subscriptions/sub_1/pause");
    });

    it("resumeSubscription should POST", async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({ id: "sub_1", status: "active" }));
      await client.resumeSubscription("sub_1");
      expect(mockFetch.mock.calls[0][0]).toContain("/subscriptions/sub_1/resume");
    });
  });

  describe("Customers", () => {
    it("getCustomer should call correct endpoint", async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({ id: "cust_1", email: "manu@test.com" }));
      await client.getCustomer("cust_1");
      expect(mockFetch.mock.calls[0][0]).toContain("/v1/customers?id=cust_1");
    });

    it("getCustomerByEmail should encode email", async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({ id: "cust_1" }));
      await client.getCustomerByEmail("test+user@example.com");
      expect(mockFetch.mock.calls[0][0]).toContain(encodeURIComponent("test+user@example.com"));
    });

    it("listCustomers should use pagination", async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({ items: [], total_count: 0 }));
      await client.listCustomers(3, 20);
      expect(mockFetch.mock.calls[0][0]).toContain("page=3&limit=20");
    });

    it("createBillingPortal should POST customer_id", async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({ customer_portal_link: "https://portal.creem.io/xxx" }));
      const result = await client.createBillingPortal("cust_1");
      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.customer_id).toBe("cust_1");
      expect(result.customer_portal_link).toContain("portal");
    });
  });

  describe("Error handling", () => {
    it("should throw CreemApiError on non-2xx response", async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ message: "Product not found", trace_id: "tr_123" }), { status: 404 })
      );
      await expect(client.getProduct("bad_id")).rejects.toThrow(CreemApiError);
    });

    it("should include status and traceId in error", async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ message: "Unauthorized", trace_id: "tr_456" }), { status: 401 })
      );
      try {
        await client.getProduct("x");
      } catch (err) {
        expect(err).toBeInstanceOf(CreemApiError);
        const e = err as CreemApiError;
        expect(e.status).toBe(401);
        expect(e.traceId).toBe("tr_456");
        expect(e.message).toBe("Unauthorized");
      }
    });

    it("should handle array messages", async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ message: ["field required", "invalid value"] }), { status: 422 })
      );
      try {
        await client.createCheckout({ productId: "", successUrl: "" });
      } catch (err) {
        expect((err as CreemApiError).message).toBe("field required, invalid value");
      }
    });

    it("should handle non-JSON error responses", async () => {
      mockFetch.mockResolvedValueOnce(new Response("Internal Server Error", { status: 500, statusText: "Internal Server Error" }));
      await expect(client.getProduct("x")).rejects.toThrow("Internal Server Error");
    });
  });
});
