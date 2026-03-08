// ============================================================
// Creem API Types — fully typed from Creem docs
// ============================================================

// --- Products ---
export interface CreemProduct {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  price: number; // cents
  currency: string;
  billing_type: "one_time" | "recurring";
  billing_period?: "every-month" | "every-3-months" | "every-6-months" | "every-year";
  status: "active" | "inactive";
  tax_mode: "inclusive" | "exclusive";
  tax_category: string;
  default_success_url: string;
  created_at: string;
  updated_at: string;
  mode: "live" | "local";
}

// --- Customers ---
export interface CreemCustomer {
  id: string;
  object: "customer";
  email: string;
  name: string;
  country: string;
  created_at: string;
  updated_at: string;
  mode: "live" | "local";
}

// --- Subscriptions ---
export type CreemSubscriptionStatus =
  | "active"
  | "trialing"
  | "canceled"
  | "expired"
  | "paused"
  | "past_due"
  | "unpaid"
  | "scheduled_cancel";

export interface CreemSubscription {
  id: string;
  object: "subscription";
  product: string | CreemProduct;
  customer: string | CreemCustomer;
  collection_method: "charge_automatically";
  status: CreemSubscriptionStatus;
  last_transaction_id?: string | null;
  last_transaction_date?: string | null;
  next_transaction_date?: string | null;
  current_period_start_date?: string | null;
  current_period_end_date?: string | null;
  canceled_at: string | null;
  created_at: string;
  updated_at: string;
  metadata?: Record<string, unknown>;
  mode: "live" | "local";
}

// --- Orders ---
export interface CreemOrder {
  id: string;
  customer: string;
  product: string;
  amount: number;
  currency: string;
  status: "paid" | "pending" | "failed";
  type: "one_time" | "recurring";
  created_at: string;
  updated_at: string;
  mode: "live" | "local";
}

// --- Checkouts ---
export interface CreemCheckout {
  id: string;
  object: "checkout";
  request_id?: string;
  checkout_url?: string;
  order?: CreemOrder;
  product?: CreemProduct;
  customer?: CreemCustomer;
  subscription?: CreemSubscription;
  custom_fields?: Array<{
    key: string;
    label: string;
    type: string;
    optional: boolean;
    value?: string;
  }>;
  status: "pending" | "completed" | "expired";
  metadata?: Record<string, unknown>;
  mode: "live" | "local";
}

// --- Webhook Events ---
export type CreemEventType =
  | "checkout.completed"
  | "subscription.active"
  | "subscription.paid"
  | "subscription.canceled"
  | "subscription.expired"
  | "subscription.trialing"
  | "subscription.paused"
  | "subscription.past_due"
  | "subscription.unpaid"
  | "subscription.update"
  | "subscription.scheduled_cancel"
  | "refund.created"
  | "dispute.created";

export interface CreemWebhookEvent<T = unknown> {
  id: string;
  eventType: CreemEventType;
  created_at: number;
  object: T;
}

export interface CreemCheckoutEvent extends CreemWebhookEvent<CreemCheckout> {
  eventType: "checkout.completed";
}

export interface CreemSubscriptionEvent extends CreemWebhookEvent<CreemSubscription> {
  eventType: Exclude<CreemEventType, "checkout.completed" | "refund.created" | "dispute.created">;
}

// --- API Config ---
export interface CreemConfig {
  apiKey: string;
  testMode?: boolean;
}

// --- Checkout creation params ---
export interface CreateCheckoutParams {
  productId: string;
  successUrl: string;
  requestId?: string;
  units?: number;
  discountCode?: string;
  customer?: { email?: string; name?: string };
  metadata?: Record<string, unknown>;
  customFields?: Array<{
    key: string;
    label: string;
    type: "text" | "number";
    optional?: boolean;
  }>;
}

// --- Webhook handler options ---
export interface CreemWebhookHandlers {
  onCheckoutCompleted?: (ctx: WebhookContext, data: CreemCheckout) => Promise<void>;
  onSubscriptionActive?: (ctx: WebhookContext, data: CreemSubscription) => Promise<void>;
  onSubscriptionPaid?: (ctx: WebhookContext, data: CreemSubscription) => Promise<void>;
  onSubscriptionCanceled?: (ctx: WebhookContext, data: CreemSubscription) => Promise<void>;
  onSubscriptionExpired?: (ctx: WebhookContext, data: CreemSubscription) => Promise<void>;
  onSubscriptionTrialing?: (ctx: WebhookContext, data: CreemSubscription) => Promise<void>;
  onSubscriptionPaused?: (ctx: WebhookContext, data: CreemSubscription) => Promise<void>;
  onSubscriptionPastDue?: (ctx: WebhookContext, data: CreemSubscription) => Promise<void>;
  onSubscriptionUpdate?: (ctx: WebhookContext, data: CreemSubscription) => Promise<void>;
  onSubscriptionScheduledCancel?: (ctx: WebhookContext, data: CreemSubscription) => Promise<void>;
  onRefundCreated?: (ctx: WebhookContext, data: unknown) => Promise<void>;
  onDisputeCreated?: (ctx: WebhookContext, data: unknown) => Promise<void>;
  /** Simplified: called for active/trialing/paid */
  onGrantAccess?: (ctx: WebhookContext, data: CreemSubscription) => Promise<void>;
  /** Simplified: called for canceled/expired/paused */
  onRevokeAccess?: (ctx: WebhookContext, data: CreemSubscription) => Promise<void>;
}

export interface WebhookContext {
  runMutation: (mutation: any, args: any) => Promise<any>;
  runQuery: (query: any, args: any) => Promise<any>;
  runAction: (action: any, args: any) => Promise<any>;
}

// --- Paginated response ---
export interface CreemPaginatedResponse<T> {
  items: T[];
  total_count: number;
  page: number;
  page_size: number;
}
