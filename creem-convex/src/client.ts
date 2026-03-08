// ============================================================
// Creem API Client — fetch-based, compatible with Convex actions
// ============================================================
import type {
  CreemConfig,
  CreemProduct,
  CreemCheckout,
  CreemSubscription,
  CreemCustomer,
  CreateCheckoutParams,
  CreemPaginatedResponse,
} from "./types/index.js";

const PROD_URL = "https://api.creem.io";
const TEST_URL = "https://test-api.creem.io";

export class CreemClient {
  private apiKey: string;
  private baseUrl: string;

  constructor(config: CreemConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.testMode ? TEST_URL : PROD_URL;
  }

  private async request<T>(
    method: "GET" | "POST" | "DELETE",
    path: string,
    body?: unknown
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      "x-api-key": this.apiKey,
      "Content-Type": "application/json",
    };

    const res = await fetch(url, {
      method,
      headers,
      ...(body ? { body: JSON.stringify(body) } : {}),
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({ message: res.statusText }));
      throw new CreemApiError(
        res.status,
        errBody.message ?? res.statusText,
        errBody.trace_id
      );
    }

    return res.json() as Promise<T>;
  }

  // --- Products ---

  async getProduct(productId: string): Promise<CreemProduct> {
    return this.request("GET", `/v1/products?id=${productId}`);
  }

  async listProducts(page = 1, limit = 10): Promise<CreemPaginatedResponse<CreemProduct>> {
    return this.request("GET", `/v1/products/search?page=${page}&limit=${limit}`);
  }

  async createProduct(params: {
    name: string;
    description?: string;
    price: number;
    currency?: string;
    billingType: "one_time" | "recurring";
    billingPeriod?: string;
  }): Promise<CreemProduct> {
    return this.request("POST", "/v1/products", {
      name: params.name,
      description: params.description,
      price: params.price,
      currency: params.currency ?? "USD",
      billing_type: params.billingType,
      billing_period: params.billingPeriod,
    });
  }

  // --- Checkouts ---

  async createCheckout(params: CreateCheckoutParams): Promise<CreemCheckout> {
    return this.request("POST", "/v1/checkouts", {
      product_id: params.productId,
      success_url: params.successUrl,
      request_id: params.requestId,
      units: params.units,
      discount_code: params.discountCode,
      customer: params.customer,
      metadata: params.metadata,
      custom_fields: params.customFields,
    });
  }

  async getCheckout(checkoutId: string): Promise<CreemCheckout> {
    return this.request("GET", `/v1/checkouts?id=${checkoutId}`);
  }

  // --- Subscriptions ---

  async getSubscription(subscriptionId: string): Promise<CreemSubscription> {
    return this.request("GET", `/v1/subscriptions?id=${subscriptionId}`);
  }

  async cancelSubscription(subscriptionId: string): Promise<CreemSubscription> {
    return this.request("POST", `/v1/subscriptions/${subscriptionId}/cancel`);
  }

  async pauseSubscription(subscriptionId: string): Promise<CreemSubscription> {
    return this.request("POST", `/v1/subscriptions/${subscriptionId}/pause`);
  }

  async resumeSubscription(subscriptionId: string): Promise<CreemSubscription> {
    return this.request("POST", `/v1/subscriptions/${subscriptionId}/resume`);
  }

  // --- Customers ---

  async getCustomer(customerId: string): Promise<CreemCustomer> {
    return this.request("GET", `/v1/customers?id=${customerId}`);
  }

  async getCustomerByEmail(email: string): Promise<CreemCustomer> {
    return this.request("GET", `/v1/customers?email=${encodeURIComponent(email)}`);
  }

  async listCustomers(page = 1, limit = 10): Promise<CreemPaginatedResponse<CreemCustomer>> {
    return this.request("GET", `/v1/customers/list?page=${page}&limit=${limit}`);
  }

  async createBillingPortal(customerId: string): Promise<{ customer_portal_link: string }> {
    return this.request("POST", "/v1/customers/billing", {
      customer_id: customerId,
    });
  }
}

// --- Error class ---
export class CreemApiError extends Error {
  constructor(
    public status: number,
    message: string | string[],
    public traceId?: string
  ) {
    super(Array.isArray(message) ? message.join(", ") : message);
    this.name = "CreemApiError";
  }
}
