// ============================================================
// creem-convex — Creem payments for Convex
// ============================================================

// --- Core Client ---
export { CreemClient, CreemApiError } from "./client.js";

// --- Schema ---
export { creemTables } from "./schema.js";

// --- Webhook ---
export { handleCreemWebhook } from "./webhook/handler.js";
export { verifyWebhookSignature } from "./webhook/verify.js";

// --- Action Helpers ---
export {
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
} from "./actions/index.js";

// --- Mutation Helpers ---
export {
  syncCheckoutToDb,
  syncSubscriptionToDb,
  upsertCustomer,
  upsertSubscription,
  logWebhookEvent,
} from "./mutations/index.js";

// --- Query Helpers ---
export {
  querySubscriptionByCustomer,
  querySubscriptionById,
  queryActiveSubscriptions,
  querySubscriptionsByProduct,
  queryPaymentsByCustomer,
  queryCustomerByEmail,
  queryHasActiveSubscription,
  queryWebhookEvents,
} from "./queries/index.js";

// --- Types ---
export type {
  CreemProduct,
  CreemCustomer,
  CreemSubscription,
  CreemSubscriptionStatus,
  CreemCheckout,
  CreemOrder,
  CreemWebhookEvent,
  CreemCheckoutEvent,
  CreemSubscriptionEvent,
  CreemEventType,
  CreemConfig,
  CreateCheckoutParams,
  CreemWebhookHandlers,
  WebhookContext,
  CreemPaginatedResponse,
} from "./types/index.js";
