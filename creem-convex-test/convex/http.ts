// =============================================
// TEST 3: Webhook handler compiles
// =============================================
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
      onCheckoutCompleted: async (ctx, data) => {
        await ctx.runMutation(internal.creem.syncPayment, { checkout: data });
      },
      onGrantAccess: async (ctx, subscription) => {
        console.log("Grant access:", subscription.id);
      },
      onRevokeAccess: async (ctx, subscription) => {
        console.log("Revoke access:", subscription.id);
      },
    });
  }),
});

export default http;
