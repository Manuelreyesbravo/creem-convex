// ============================================================
// Creem Webhook Handler — process events from Creem
// ============================================================
import { verifyWebhookSignature } from "./verify.js";
import type {
  CreemWebhookEvent,
  CreemWebhookHandlers,
  CreemCheckout,
  CreemSubscription,
  CreemEventType,
} from "../types/index.js";

const GRANT_EVENTS: CreemEventType[] = [
  "subscription.active",
  "subscription.trialing",
  "subscription.paid",
];

const REVOKE_EVENTS: CreemEventType[] = [
  "subscription.canceled",
  "subscription.expired",
  "subscription.paused",
];

/**
 * Process a Creem webhook request.
 * Use inside your Convex httpAction:
 *
 * ```ts
 * // convex/http.ts
 * import { httpRouter } from "convex/server";
 * import { httpAction } from "./_generated/server";
 * import { handleCreemWebhook } from "creem-convex";
 *
 * const http = httpRouter();
 * http.route({
 *   path: "/creem/webhook",
 *   method: "POST",
 *   handler: httpAction(async (ctx, request) => {
 *     return await handleCreemWebhook(ctx, request, {
 *       onCheckoutCompleted: async (ctx, data) => {
 *         await ctx.runMutation(internal.creem.syncPayment, { checkout: data });
 *       },
 *       onGrantAccess: async (ctx, data) => {
 *         console.log("Grant access to", data.customer);
 *       },
 *       onRevokeAccess: async (ctx, data) => {
 *         console.log("Revoke access from", data.customer);
 *       },
 *     });
 *   }),
 * });
 * export default http;
 * ```
 */
export async function handleCreemWebhook(
  ctx: any,
  request: Request,
  handlers: CreemWebhookHandlers
): Promise<Response> {
  // Check signature header
  const signature = request.headers.get("creem-signature");
  if (!signature) {
    return new Response("Missing creem-signature header", { status: 401 });
  }

  const rawBody = await request.text();

  // Verify signature
  const webhookSecret = process.env.CREEM_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("CREEM_WEBHOOK_SECRET environment variable not set");
    return new Response("Server configuration error", { status: 500 });
  }

  const isValid = await verifyWebhookSignature(rawBody, signature, webhookSecret);
  if (!isValid) {
    return new Response("Invalid signature", { status: 401 });
  }

  // Parse event
  let event: CreemWebhookEvent;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  // Build context for handlers
  const webhookCtx = {
    runMutation: ctx.runMutation.bind(ctx),
    runQuery: ctx.runQuery.bind(ctx),
    runAction: ctx.runAction.bind(ctx),
  };

  // Route event to handlers
  try {
    await routeEvent(event, handlers, webhookCtx);
  } catch (err) {
    console.error(`Error handling ${event.eventType}:`, err);
    return new Response("Handler error", { status: 500 });
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

async function routeEvent(
  event: CreemWebhookEvent,
  handlers: CreemWebhookHandlers,
  ctx: any
) {
  const { eventType } = event;

  // Specific handlers
  const handlerMap: Record<string, ((ctx: any, data: any) => Promise<void>) | undefined> = {
    "checkout.completed": handlers.onCheckoutCompleted,
    "subscription.active": handlers.onSubscriptionActive,
    "subscription.paid": handlers.onSubscriptionPaid,
    "subscription.canceled": handlers.onSubscriptionCanceled,
    "subscription.expired": handlers.onSubscriptionExpired,
    "subscription.trialing": handlers.onSubscriptionTrialing,
    "subscription.paused": handlers.onSubscriptionPaused,
    "subscription.past_due": handlers.onSubscriptionPastDue,
    "subscription.update": handlers.onSubscriptionUpdate,
    "subscription.scheduled_cancel": handlers.onSubscriptionScheduledCancel,
    "refund.created": handlers.onRefundCreated,
    "dispute.created": handlers.onDisputeCreated,
  };

  const handler = handlerMap[eventType];
  if (handler) {
    await handler(ctx, event.object);
  }

  // Simplified grant/revoke
  if (GRANT_EVENTS.includes(eventType) && handlers.onGrantAccess) {
    await handlers.onGrantAccess(ctx, event.object as CreemSubscription);
  }
  if (REVOKE_EVENTS.includes(eventType) && handlers.onRevokeAccess) {
    await handlers.onRevokeAccess(ctx, event.object as CreemSubscription);
  }
}
