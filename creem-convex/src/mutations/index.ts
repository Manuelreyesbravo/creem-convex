// ============================================================
// Mutation Helpers — sync Creem webhook data to Convex DB
// Use inside your own internalMutation handlers.
// ============================================================
import type { CreemCheckout, CreemSubscription, CreemCustomer } from "../types/index.js";

/**
 * Sync a checkout.completed event to the database.
 *
 * ```ts
 * // convex/creem.ts
 * import { internalMutation } from "./_generated/server";
 * import { syncCheckoutToDb } from "creem-convex";
 *
 * export const syncPayment = internalMutation({
 *   args: { checkout: v.any() },
 *   handler: async (ctx, args) => {
 *     await syncCheckoutToDb(ctx.db, args.checkout);
 *   },
 * });
 * ```
 */
export async function syncCheckoutToDb(db: any, checkout: CreemCheckout) {
  const order = checkout.order;
  const customer = checkout.customer;
  const product = checkout.product;

  // Upsert customer
  if (customer) {
    await upsertCustomer(db, customer);
  }

  // Insert payment
  await db.insert("creem_payments", {
    creemCheckoutId: checkout.id,
    creemOrderId: order?.id,
    creemCustomerId: customer?.id,
    creemProductId: product?.id ?? "",
    creemSubscriptionId: checkout.subscription?.id,
    amount: order?.amount ?? 0,
    currency: order?.currency ?? "USD",
    status: order?.status ?? "paid",
    type: order?.type ?? "one_time",
    customerEmail: customer?.email,
    customerName: customer?.name,
    metadata: checkout.metadata,
    creemCreatedAt: order?.created_at ?? new Date().toISOString(),
  });

  // Sync subscription if exists
  if (checkout.subscription) {
    await upsertSubscription(db, checkout.subscription, customer);
  }
}

/**
 * Sync a subscription event to the database.
 */
export async function syncSubscriptionToDb(db: any, subscription: CreemSubscription) {
  const customer =
    typeof subscription.customer === "object" ? subscription.customer : null;
  await upsertSubscription(db, subscription, customer as CreemCustomer | null);
}

/**
 * Upsert a customer in the database.
 */
export async function upsertCustomer(db: any, customer: CreemCustomer) {
  const existing = await db
    .query("creem_customers")
    .withIndex("by_creem_id", (q: any) => q.eq("creemCustomerId", customer.id))
    .unique();

  const data = {
    creemCustomerId: customer.id,
    email: customer.email,
    name: customer.name,
    country: customer.country,
    creemCreatedAt: customer.created_at,
  };

  if (existing) {
    await db.patch(existing._id, data);
  } else {
    await db.insert("creem_customers", data);
  }
}

/**
 * Upsert a subscription in the database.
 */
export async function upsertSubscription(
  db: any,
  sub: CreemSubscription,
  customer: CreemCustomer | null
) {
  const existing = await db
    .query("creem_subscriptions")
    .withIndex("by_creem_id", (q: any) => q.eq("creemSubscriptionId", sub.id))
    .unique();

  const productId = typeof sub.product === "object" ? sub.product.id : sub.product;
  const customerId = typeof sub.customer === "object" ? sub.customer.id : sub.customer;

  const data = {
    creemSubscriptionId: sub.id,
    creemCustomerId: customerId,
    creemProductId: productId,
    status: sub.status,
    customerEmail: customer?.email,
    customerName: customer?.name,
    currentPeriodStart: sub.current_period_start_date ?? undefined,
    currentPeriodEnd: sub.current_period_end_date ?? undefined,
    canceledAt: sub.canceled_at ?? undefined,
    metadata: sub.metadata,
    creemCreatedAt: sub.created_at,
    creemUpdatedAt: sub.updated_at,
  };

  if (existing) {
    await db.patch(existing._id, data);
  } else {
    await db.insert("creem_subscriptions", data);
  }
}

/**
 * Log a webhook event (idempotent).
 */
export async function logWebhookEvent(
  db: any,
  eventId: string,
  eventType: string,
  payload: any,
  createdAt: number
) {
  const existing = await db
    .query("creem_webhook_events")
    .withIndex("by_event_id", (q: any) => q.eq("creemEventId", eventId))
    .unique();

  if (existing) return existing._id;

  return await db.insert("creem_webhook_events", {
    creemEventId: eventId,
    eventType,
    processed: true,
    payload,
    creemCreatedAt: createdAt,
  });
}
