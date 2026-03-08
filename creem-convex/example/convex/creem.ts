// ============================================================
// Demo: Convex functions using creem-convex helpers
// ============================================================
import { action, internalMutation, mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import {
  getCreemClient,
  creemCreateCheckout,
  syncCheckoutToDb,
  syncSubscriptionToDb,
  logWebhookEvent,
  querySubscriptionByCustomer,
  queryHasActiveSubscription,
  queryPaymentsByCustomer,
  queryWebhookEvents,
} from "creem-convex";

// ── Actions (call Creem API) ─────────────────────────────

export const createCheckout = action({
  args: {
    productId: v.string(),
    successUrl: v.string(),
    userEmail: v.optional(v.string()),
    metadata: v.optional(v.any()),
  },
  handler: async (_ctx, args) => {
    return await creemCreateCheckout({
      productId: args.productId,
      successUrl: args.successUrl,
      customer: args.userEmail ? { email: args.userEmail } : undefined,
      metadata: args.metadata,
    });
  },
});

export const fetchProducts = action({
  args: {},
  handler: async () => {
    const client = getCreemClient();
    return await client.listProducts(1, 20);
  },
});

export const openBillingPortal = action({
  args: { customerId: v.string() },
  handler: async (_ctx, args) => {
    const client = getCreemClient();
    return await client.createBillingPortal(args.customerId);
  },
});

// ── Mutations (write to DB) ──────────────────────────────

export const syncPayment = internalMutation({
  args: { checkout: v.any() },
  handler: async (ctx, args) => {
    await syncCheckoutToDb(ctx.db, args.checkout);
  },
});

export const syncSub = internalMutation({
  args: { subscription: v.any() },
  handler: async (ctx, args) => {
    await syncSubscriptionToDb(ctx.db, args.subscription);
  },
});

export const logEvent = internalMutation({
  args: {
    creemEventId: v.string(),
    eventType: v.string(),
    payload: v.any(),
    creemCreatedAt: v.number(),
  },
  handler: async (ctx, args) => {
    await logWebhookEvent(
      ctx.db,
      args.creemEventId,
      args.eventType,
      args.payload,
      args.creemCreatedAt
    );
  },
});

export const grantAccess = internalMutation({
  args: { customerEmail: v.string(), plan: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.customerEmail))
      .unique();

    if (user) {
      await ctx.db.patch(user._id, { hasAccess: true, plan: args.plan });
    } else {
      await ctx.db.insert("users", {
        email: args.customerEmail,
        hasAccess: true,
        plan: args.plan,
      });
    }
  },
});

export const revokeAccess = internalMutation({
  args: { customerEmail: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.customerEmail))
      .unique();

    if (user) {
      await ctx.db.patch(user._id, { hasAccess: false, plan: "free" });
    }
  },
});

// ── Queries (reactive reads) ─────────────────────────────

export const getUser = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .unique();
  },
});

export const getSubscription = query({
  args: { creemCustomerId: v.string() },
  handler: async (ctx, args) => {
    return await querySubscriptionByCustomer(ctx.db, args.creemCustomerId);
  },
});

export const checkAccess = query({
  args: { creemCustomerId: v.string() },
  handler: async (ctx, args) => {
    return await queryHasActiveSubscription(ctx.db, args.creemCustomerId);
  },
});

export const getPayments = query({
  args: { creemCustomerId: v.string() },
  handler: async (ctx, args) => {
    return await queryPaymentsByCustomer(ctx.db, args.creemCustomerId);
  },
});

export const getWebhookEvents = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    return await queryWebhookEvents(ctx.db, args.limit ?? 20);
  },
});

export const listUsers = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("users").collect();
  },
});
