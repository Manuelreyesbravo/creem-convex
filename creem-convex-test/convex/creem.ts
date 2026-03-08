// =============================================
// TEST 2: All main imports work
// =============================================
import { action, internalMutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import {
  // Client
  CreemClient,
  CreemApiError,
  // Action helpers
  getCreemClient,
  creemCreateCheckout,
  creemGetProduct,
  creemListProducts,
  creemGetSubscription,
  creemCancelSubscription,
  creemPauseSubscription,
  creemResumeSubscription,
  creemGetCustomer,
  creemCreateBillingPortal,
  // Mutation helpers
  syncCheckoutToDb,
  syncSubscriptionToDb,
  upsertCustomer,
  upsertSubscription,
  logWebhookEvent,
  // Query helpers
  querySubscriptionByCustomer,
  querySubscriptionById,
  queryActiveSubscriptions,
  querySubscriptionsByProduct,
  queryPaymentsByCustomer,
  queryCustomerByEmail,
  queryHasActiveSubscription,
  queryWebhookEvents,
} from "creem-convex";

// Types
import type {
  CreemProduct,
  CreemCustomer,
  CreemSubscription,
  CreemCheckout,
  CreemConfig,
  CreateCheckoutParams,
  CreemWebhookHandlers,
} from "creem-convex";

// =============================================
// Real Convex functions using creem-convex
// =============================================

export const createCheckout = action({
  args: {
    productId: v.string(),
    successUrl: v.string(),
    customerEmail: v.optional(v.string()),
  },
  handler: async (_ctx, args) => {
    return await creemCreateCheckout({
      productId: args.productId,
      successUrl: args.successUrl,
      customer: args.customerEmail ? { email: args.customerEmail } : undefined,
    });
  },
});

export const syncPayment = internalMutation({
  args: { checkout: v.any() },
  handler: async (ctx, args) => {
    await syncCheckoutToDb(ctx.db, args.checkout);
  },
});

export const hasAccess = query({
  args: { creemCustomerId: v.string() },
  handler: async (ctx, args) => {
    return await queryHasActiveSubscription(ctx.db, args.creemCustomerId);
  },
});

export const getSubscription = query({
  args: { creemCustomerId: v.string() },
  handler: async (ctx, args) => {
    return await querySubscriptionByCustomer(ctx.db, args.creemCustomerId);
  },
});

export const getPayments = query({
  args: { creemCustomerId: v.string() },
  handler: async (ctx, args) => {
    return await queryPaymentsByCustomer(ctx.db, args.creemCustomerId);
  },
});

// Verify type safety works
const _typeCheck: CreemConfig = { apiKey: "test", testMode: true };
const _typeCheck2: CreateCheckoutParams = { productId: "prod_1", successUrl: "https://app.com" };
