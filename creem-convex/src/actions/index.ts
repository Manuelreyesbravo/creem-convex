// ============================================================
// Convex Action Helpers — use inside your own Convex actions
// ============================================================
import { CreemClient } from "../client.js";
import type { CreateCheckoutParams } from "../types/index.js";

/**
 * Get a configured CreemClient from env vars.
 * Use inside Convex actions.
 *
 * ```ts
 * // convex/creem.ts
 * import { action } from "./_generated/server";
 * import { getCreemClient } from "creem-convex";
 *
 * export const createCheckout = action({
 *   args: { productId: v.string(), successUrl: v.string() },
 *   handler: async (ctx, args) => {
 *     const creem = getCreemClient();
 *     return await creem.createCheckout(args);
 *   },
 * });
 * ```
 */
export function getCreemClient(): CreemClient {
  const apiKey = process.env.CREEM_API_KEY;
  if (!apiKey) throw new Error("CREEM_API_KEY environment variable not set");
  const testMode = process.env.CREEM_TEST_MODE === "true";
  return new CreemClient({ apiKey, testMode });
}

/**
 * Helper: create checkout and return URL.
 */
export async function creemCreateCheckout(params: CreateCheckoutParams) {
  const client = getCreemClient();
  const checkout = await client.createCheckout(params);
  return {
    checkoutId: checkout.id,
    checkoutUrl: checkout.checkout_url,
    status: checkout.status,
  };
}

/**
 * Helper: get product details.
 */
export async function creemGetProduct(productId: string) {
  const client = getCreemClient();
  return await client.getProduct(productId);
}

/**
 * Helper: list products.
 */
export async function creemListProducts(page = 1, limit = 10) {
  const client = getCreemClient();
  return await client.listProducts(page, limit);
}

/**
 * Helper: get subscription.
 */
export async function creemGetSubscription(subscriptionId: string) {
  const client = getCreemClient();
  return await client.getSubscription(subscriptionId);
}

/**
 * Helper: cancel subscription.
 */
export async function creemCancelSubscription(subscriptionId: string) {
  const client = getCreemClient();
  return await client.cancelSubscription(subscriptionId);
}

/**
 * Helper: pause subscription.
 */
export async function creemPauseSubscription(subscriptionId: string) {
  const client = getCreemClient();
  return await client.pauseSubscription(subscriptionId);
}

/**
 * Helper: resume subscription.
 */
export async function creemResumeSubscription(subscriptionId: string) {
  const client = getCreemClient();
  return await client.resumeSubscription(subscriptionId);
}

/**
 * Helper: get customer by ID or email.
 */
export async function creemGetCustomer(opts: { customerId?: string; email?: string }) {
  const client = getCreemClient();
  if (opts.customerId) return await client.getCustomer(opts.customerId);
  if (opts.email) return await client.getCustomerByEmail(opts.email);
  throw new Error("Either customerId or email is required");
}

/**
 * Helper: create billing portal.
 */
export async function creemCreateBillingPortal(customerId: string) {
  const client = getCreemClient();
  return await client.createBillingPortal(customerId);
}
