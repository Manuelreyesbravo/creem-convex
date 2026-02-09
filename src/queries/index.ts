// ============================================================
// Query Helpers — use inside your own Convex queries
// ============================================================

/**
 * Get subscription by Creem customer ID.
 *
 * ```ts
 * import { query } from "./_generated/server";
 * import { querySubscriptionByCustomer } from "creem-convex";
 *
 * export const getSubscription = query({
 *   args: { creemCustomerId: v.string() },
 *   handler: async (ctx, args) => {
 *     return await querySubscriptionByCustomer(ctx.db, args.creemCustomerId);
 *   },
 * });
 * ```
 */
export async function querySubscriptionByCustomer(db: any, creemCustomerId: string) {
  return await db
    .query("creem_subscriptions")
    .withIndex("by_customer", (q: any) => q.eq("creemCustomerId", creemCustomerId))
    .order("desc")
    .first();
}

export async function querySubscriptionById(db: any, creemSubscriptionId: string) {
  return await db
    .query("creem_subscriptions")
    .withIndex("by_creem_id", (q: any) => q.eq("creemSubscriptionId", creemSubscriptionId))
    .unique();
}

export async function queryActiveSubscriptions(db: any) {
  return await db
    .query("creem_subscriptions")
    .withIndex("by_status", (q: any) => q.eq("status", "active"))
    .collect();
}

export async function querySubscriptionsByProduct(db: any, creemProductId: string) {
  return await db
    .query("creem_subscriptions")
    .withIndex("by_product", (q: any) => q.eq("creemProductId", creemProductId))
    .collect();
}

export async function queryPaymentsByCustomer(db: any, creemCustomerId: string) {
  return await db
    .query("creem_payments")
    .withIndex("by_customer", (q: any) => q.eq("creemCustomerId", creemCustomerId))
    .order("desc")
    .collect();
}

export async function queryCustomerByEmail(db: any, email: string) {
  return await db
    .query("creem_customers")
    .withIndex("by_email", (q: any) => q.eq("email", email))
    .unique();
}

/**
 * Check if customer has active subscription.
 * Returns { hasAccess, status, subscription }
 */
export async function queryHasActiveSubscription(db: any, creemCustomerId: string) {
  const sub = await db
    .query("creem_subscriptions")
    .withIndex("by_customer", (q: any) => q.eq("creemCustomerId", creemCustomerId))
    .order("desc")
    .first();

  if (!sub) return { hasAccess: false, status: null, subscription: null };

  const activeStatuses = ["active", "trialing"];
  return {
    hasAccess: activeStatuses.includes(sub.status),
    status: sub.status,
    subscription: sub,
  };
}

export async function queryWebhookEvents(db: any, limit = 50) {
  return await db
    .query("creem_webhook_events")
    .order("desc")
    .take(limit);
}
