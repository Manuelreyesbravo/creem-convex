// ============================================================
// Demo: HTTP Router with Creem webhook
// ============================================================
import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { handleCreemWebhook } from "creem-convex";

const http = httpRouter();

http.route({
  path: "/creem/webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    return await handleCreemWebhook(ctx, request, {
      // ── When checkout completes, sync payment to DB ──
      onCheckoutCompleted: async (ctx, data) => {
        await ctx.runMutation(internal.creem.syncPayment, { checkout: data });
        await ctx.runMutation(internal.creem.logEvent, {
          creemEventId: `checkout_${data.id}`,
          eventType: "checkout.completed",
          payload: data,
          creemCreatedAt: Date.now(),
        });
      },

      // ── Grant access on active/trialing/paid ──
      onGrantAccess: async (ctx, data) => {
        await ctx.runMutation(internal.creem.syncSub, { subscription: data });
        const customer =
          typeof data.customer === "object" ? data.customer : null;
        const product =
          typeof data.product === "object" ? data.product : null;

        if (customer?.email) {
          await ctx.runMutation(internal.creem.grantAccess, {
            customerEmail: customer.email,
            plan: product?.name ?? "pro",
          });
        }
      },

      // ── Revoke access on canceled/expired/paused ──
      onRevokeAccess: async (ctx, data) => {
        await ctx.runMutation(internal.creem.syncSub, { subscription: data });
        const customer =
          typeof data.customer === "object" ? data.customer : null;

        if (customer?.email) {
          await ctx.runMutation(internal.creem.revokeAccess, {
            customerEmail: customer.email,
          });
        }
      },

      // ── Log all subscription events ──
      onSubscriptionActive: async (ctx, data) => {
        await ctx.runMutation(internal.creem.logEvent, {
          creemEventId: `sub_active_${data.id}_${Date.now()}`,
          eventType: "subscription.active",
          payload: data,
          creemCreatedAt: Date.now(),
        });
      },

      onSubscriptionCanceled: async (ctx, data) => {
        await ctx.runMutation(internal.creem.logEvent, {
          creemEventId: `sub_canceled_${data.id}_${Date.now()}`,
          eventType: "subscription.canceled",
          payload: data,
          creemCreatedAt: Date.now(),
        });
      },

      onSubscriptionPaid: async (ctx, data) => {
        await ctx.runMutation(internal.creem.logEvent, {
          creemEventId: `sub_paid_${data.id}_${Date.now()}`,
          eventType: "subscription.paid",
          payload: data,
          creemCreatedAt: Date.now(),
        });
      },
    });
  }),
});

export default http;
