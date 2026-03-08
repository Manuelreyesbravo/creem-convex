# creem-convex

[![npm version](https://img.shields.io/npm/v/creem-convex.svg)](https://www.npmjs.com/package/creem-convex)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Tests](https://img.shields.io/badge/tests-71%20passing-brightgreen.svg)]()
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)]()

**Creem payments for Convex** — drop-in integration with real-time reactivity. Checkouts, subscriptions, webhooks, and customer management in minutes.

## Why creem-convex?

- **One-line schema** — `...creemTables` adds 4 indexed tables to your Convex schema
- **Real-time by default** — subscriptions, payments, and access status update instantly via Convex reactivity
- **Webhook-first** — HMAC-SHA256 verified handler with grant/revoke access pattern built in
- **Type-safe** — Full TypeScript types for every Creem API object
- **Zero dependencies** — Only peer deps on `convex` and optionally `react`

## Quick Start

### 1. Install

```bash
npm install creem-convex
```

### 2. Add tables to your schema

```ts
// convex/schema.ts
import { defineSchema } from "convex/server";
import { creemTables } from "creem-convex/schema";

export default defineSchema({
  ...creemTables,
  // your other tables
});
```

This adds `creem_payments`, `creem_subscriptions`, `creem_customers`, and `creem_webhook_events` with proper indexes.

### 3. Set environment variables

In your Convex dashboard → Settings → Environment Variables:

```
CREEM_API_KEY=creem_your_api_key
CREEM_WEBHOOK_SECRET=whsec_your_webhook_secret
CREEM_TEST_MODE=true
```

### 4. Create your Creem actions

```ts
// convex/creem.ts
import { action, internalMutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import {
  creemCreateCheckout,
  syncCheckoutToDb,
  syncSubscriptionToDb,
  querySubscriptionByCustomer,
  queryHasActiveSubscription,
  queryPaymentsByCustomer,
} from "creem-convex";

// --- Actions (call Creem API) ---

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

// --- Mutations (sync webhook data to DB) ---

export const syncPayment = internalMutation({
  args: { checkout: v.any() },
  handler: async (ctx, args) => {
    await syncCheckoutToDb(ctx.db, args.checkout);
  },
});

export const syncSubscription = internalMutation({
  args: { subscription: v.any() },
  handler: async (ctx, args) => {
    await syncSubscriptionToDb(ctx.db, args.subscription);
  },
});

// --- Queries (real-time!) ---

export const getSubscription = query({
  args: { creemCustomerId: v.string() },
  handler: async (ctx, args) => {
    return await querySubscriptionByCustomer(ctx.db, args.creemCustomerId);
  },
});

export const hasAccess = query({
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
```

### 5. Set up the webhook handler

```ts
// convex/http.ts
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
      onGrantAccess: async (ctx, data) => {
        await ctx.runMutation(internal.creem.syncSubscription, { subscription: data });
        // Add your own logic: unlock features, send welcome email, etc.
      },
      onRevokeAccess: async (ctx, data) => {
        await ctx.runMutation(internal.creem.syncSubscription, { subscription: data });
        // Add your own logic: lock features, send cancellation email, etc.
      },
    });
  }),
});

export default http;
```

### 6. Use in your React app

```tsx
import { useQuery, useAction } from "convex/react";
import { api } from "../convex/_generated/api";

function PricingButton({ productId }: { productId: string }) {
  const checkout = useAction(api.creem.createCheckout);

  return (
    <button onClick={() => checkout({
      productId,
      successUrl: window.location.origin + "/success",
    })}>
      Subscribe Now
    </button>
  );
}

function Dashboard({ customerId }: { customerId: string }) {
  // Real-time! Updates instantly when webhook arrives
  const access = useQuery(api.creem.hasAccess, { creemCustomerId: customerId });
  const payments = useQuery(api.creem.getPayments, { creemCustomerId: customerId });

  if (!access?.hasAccess) return <PricingButton productId="prod_xxx" />;

  return (
    <div>
      <p>Status: {access.status}</p>
      <p>Payments: {payments?.length ?? 0}</p>
    </div>
  );
}
```

## API Reference

### Schema

```ts
import { creemTables } from "creem-convex/schema";
```

Exports 4 table definitions with indexes:

| Table | Key Indexes |
|-------|------------|
| `creem_payments` | `by_checkout`, `by_customer`, `by_product`, `by_subscription` |
| `creem_subscriptions` | `by_creem_id`, `by_customer`, `by_product`, `by_status` |
| `creem_customers` | `by_creem_id`, `by_email` |
| `creem_webhook_events` | `by_event_id`, `by_type` |

### CreemClient

```ts
import { CreemClient } from "creem-convex";

const client = new CreemClient({ apiKey: "creem_xxx", testMode: true });
```

| Method | Description |
|--------|-------------|
| `getProduct(id)` | Get product by ID |
| `listProducts(page, limit)` | List products (paginated) |
| `createProduct(params)` | Create a new product |
| `createCheckout(params)` | Create checkout session → returns `checkout_url` |
| `getCheckout(id)` | Get checkout by ID |
| `getSubscription(id)` | Get subscription by ID |
| `cancelSubscription(id)` | Cancel subscription |
| `pauseSubscription(id)` | Pause subscription |
| `resumeSubscription(id)` | Resume subscription |
| `getCustomer(id)` | Get customer by ID |
| `getCustomerByEmail(email)` | Get customer by email |
| `listCustomers(page, limit)` | List customers (paginated) |
| `createBillingPortal(customerId)` | Get billing portal URL |

### Action Helpers

Pre-configured helpers that read `CREEM_API_KEY` and `CREEM_TEST_MODE` from environment:

```ts
import {
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
} from "creem-convex";
```

### Mutation Helpers

Sync Creem webhook data to your Convex database:

```ts
import {
  syncCheckoutToDb,    // Sync checkout.completed → payments + customer + subscription
  syncSubscriptionToDb, // Sync subscription events → subscription + customer
  upsertCustomer,       // Upsert customer record
  upsertSubscription,   // Upsert subscription record
  logWebhookEvent,      // Idempotent event logging
} from "creem-convex";
```

### Query Helpers

Real-time queries for your Convex functions:

```ts
import {
  querySubscriptionByCustomer,  // Latest subscription for customer
  querySubscriptionById,         // Subscription by Creem ID
  queryActiveSubscriptions,      // All active subscriptions
  querySubscriptionsByProduct,   // Subscriptions for a product
  queryPaymentsByCustomer,       // Payment history
  queryCustomerByEmail,          // Find customer by email
  queryHasActiveSubscription,    // { hasAccess, status, subscription }
  queryWebhookEvents,            // Recent webhook events
} from "creem-convex";
```

### React Hooks

```ts
import {
  useCreemSubscription,  // Real-time subscription status
  useCreemAccess,         // Real-time { hasAccess, status }
  useCreemCheckout,       // { startCheckout, isLoading, error }
  useCreemPayments,       // Real-time payment list
} from "creem-convex/react";
```

### Webhook Handler

```ts
import { handleCreemWebhook } from "creem-convex";
```

Supported event handlers:

| Handler | Triggered by |
|---------|-------------|
| `onCheckoutCompleted` | `checkout.completed` |
| `onSubscriptionActive` | `subscription.active` |
| `onSubscriptionPaid` | `subscription.paid` |
| `onSubscriptionCanceled` | `subscription.canceled` |
| `onSubscriptionExpired` | `subscription.expired` |
| `onSubscriptionTrialing` | `subscription.trialing` |
| `onSubscriptionPaused` | `subscription.paused` |
| `onSubscriptionPastDue` | `subscription.past_due` |
| `onSubscriptionUpdate` | `subscription.update` |
| `onSubscriptionScheduledCancel` | `subscription.scheduled_cancel` |
| `onRefundCreated` | `refund.created` |
| `onDisputeCreated` | `dispute.created` |
| **`onGrantAccess`** | `subscription.active` / `.trialing` / `.paid` |
| **`onRevokeAccess`** | `subscription.canceled` / `.expired` / `.paused` |

The `onGrantAccess` and `onRevokeAccess` handlers simplify the most common pattern: deciding whether a user should have access to your product.

## Testing

```bash
npm test              # Run all tests
npm run test:watch    # Watch mode
npm run test:coverage # Coverage report
```

71 tests covering client, webhook verification, handler routing, mutations, queries, and schema.

## Environments

| Mode | API URL | Use |
|------|---------|-----|
| Test | `https://test-api.creem.io` | Development, no real charges |
| Live | `https://api.creem.io` | Production |

Set `CREEM_TEST_MODE=true` in your Convex environment for development.

## License

[MIT](LICENSE)

## Author

**Manuel Reyes** — [LatamFlows](https://latamflows.com)
