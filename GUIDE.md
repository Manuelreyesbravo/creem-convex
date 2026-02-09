# Integration Guide

Step-by-step guide to integrate Creem payments into your Convex app using `creem-convex`.

## Prerequisites

- A [Convex](https://convex.dev) project up and running
- A [Creem](https://creem.io) account with at least one product created
- Node.js 18+

## Step 1: Install the package

```bash
npm install creem-convex
```

Peer dependencies: `convex >= 1.0.0`, `react >= 18.0.0` (optional, only for hooks).

## Step 2: Add Creem tables to your schema

Open your `convex/schema.ts` and spread `creemTables`:

```ts
// convex/schema.ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { creemTables } from "creem-convex/schema";

export default defineSchema({
  ...creemTables,

  // Your existing tables
  users: defineTable({
    name: v.string(),
    email: v.string(),
    creemCustomerId: v.optional(v.string()), // link to Creem
  }).index("by_email", ["email"]),
});
```

This creates 4 tables automatically:

- `creem_payments` — every completed checkout
- `creem_subscriptions` — subscription lifecycle
- `creem_customers` — customer records
- `creem_webhook_events` — audit log of all events

Run `npx convex dev` to push the schema.

## Step 3: Configure environment variables

In the Convex dashboard, go to **Settings → Environment Variables** and add:

| Variable | Where to find it | Example |
|----------|-----------------|---------|
| `CREEM_API_KEY` | Creem Dashboard → API Keys | `creem_live_abc123...` |
| `CREEM_WEBHOOK_SECRET` | Creem Dashboard → Webhooks → Secret | `whsec_xyz789...` |
| `CREEM_TEST_MODE` | Set to `true` for development | `true` |

> **Tip:** Use `true` for test mode during development. Creem provides a sandbox environment with test data at `test-api.creem.io`. Switch to `false` for production.

## Step 4: Create your Creem module

Create a single file with all your Creem-related Convex functions:

```ts
// convex/creem.ts
import { action, internalMutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import {
  creemCreateCheckout,
  creemGetSubscription,
  creemCancelSubscription,
  creemCreateBillingPortal,
  syncCheckoutToDb,
  syncSubscriptionToDb,
  queryHasActiveSubscription,
  querySubscriptionByCustomer,
  queryPaymentsByCustomer,
  queryCustomerByEmail,
  logWebhookEvent,
} from "creem-convex";

// =============================================
// ACTIONS — call Creem API from Convex
// =============================================

export const createCheckout = action({
  args: {
    productId: v.string(),
    successUrl: v.string(),
    customerEmail: v.optional(v.string()),
    metadata: v.optional(v.any()),
  },
  handler: async (_ctx, args) => {
    return await creemCreateCheckout({
      productId: args.productId,
      successUrl: args.successUrl,
      customer: args.customerEmail ? { email: args.customerEmail } : undefined,
      metadata: args.metadata,
    });
  },
});

export const cancelSubscription = action({
  args: { subscriptionId: v.string() },
  handler: async (_ctx, args) => {
    return await creemCancelSubscription(args.subscriptionId);
  },
});

export const getBillingPortal = action({
  args: { customerId: v.string() },
  handler: async (_ctx, args) => {
    return await creemCreateBillingPortal(args.customerId);
  },
});

// =============================================
// INTERNAL MUTATIONS — webhook data → database
// =============================================

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
    eventId: v.string(),
    eventType: v.string(),
    payload: v.any(),
    createdAt: v.number(),
  },
  handler: async (ctx, args) => {
    await logWebhookEvent(ctx.db, args.eventId, args.eventType, args.payload, args.createdAt);
  },
});

// =============================================
// QUERIES — real-time, reactive
// =============================================

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

export const getCustomerByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    return await queryCustomerByEmail(ctx.db, args.email);
  },
});
```

## Step 5: Set up the webhook endpoint

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
      // --- Payment completed ---
      onCheckoutCompleted: async (ctx, checkout) => {
        // Sync payment, customer, and subscription to DB
        await ctx.runMutation(internal.creem.syncPayment, { checkout });

        // Log the event
        // (optional, useful for debugging)
      },

      // --- Grant access (active, trialing, paid) ---
      onGrantAccess: async (ctx, subscription) => {
        await ctx.runMutation(internal.creem.syncSub, { subscription });

        // Your custom logic:
        // - Enable premium features
        // - Send welcome email
        // - Update user record
      },

      // --- Revoke access (canceled, expired, paused) ---
      onRevokeAccess: async (ctx, subscription) => {
        await ctx.runMutation(internal.creem.syncSub, { subscription });

        // Your custom logic:
        // - Disable premium features
        // - Send retention email
        // - Downgrade user
      },
    });
  }),
});

export default http;
```

After deploying, your webhook URL will be:

```
https://<your-deployment>.convex.site/creem/webhook
```

Go to **Creem Dashboard → Webhooks** and add this URL. Select the events you want to receive.

## Step 6: Wire up your frontend

### Checkout button

```tsx
import { useAction } from "convex/react";
import { api } from "../convex/_generated/api";

function CheckoutButton({ productId }: { productId: string }) {
  const createCheckout = useAction(api.creem.createCheckout);
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    try {
      const result = await createCheckout({
        productId,
        successUrl: window.location.origin + "/success",
      });
      if (result.checkoutUrl) {
        window.location.href = result.checkoutUrl;
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <button onClick={handleClick} disabled={loading}>
      {loading ? "Redirecting..." : "Subscribe"}
    </button>
  );
}
```

### Access gate (real-time)

```tsx
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";

function ProtectedContent({ customerId }: { customerId: string }) {
  const access = useQuery(api.creem.hasAccess, {
    creemCustomerId: customerId,
  });

  // Loading state
  if (access === undefined) return <Spinner />;

  // No access
  if (!access.hasAccess) {
    return (
      <div>
        <p>Upgrade to access this content.</p>
        <CheckoutButton productId="prod_xxx" />
      </div>
    );
  }

  // Has access — this updates in REAL TIME when webhook arrives
  return (
    <div>
      <p>Welcome! Your subscription is {access.status}.</p>
      <PremiumFeatures />
    </div>
  );
}
```

### Billing portal

```tsx
function ManageSubscription({ customerId }: { customerId: string }) {
  const getBillingPortal = useAction(api.creem.getBillingPortal);

  const openPortal = async () => {
    const result = await getBillingPortal({ customerId });
    window.open(result.customer_portal_link, "_blank");
  };

  return <button onClick={openPortal}>Manage Subscription</button>;
}
```

## Step 7: Test the flow

1. Make sure `CREEM_TEST_MODE=true` in your Convex environment
2. Run `npx convex dev`
3. Click your checkout button — it redirects to Creem's test checkout
4. Complete the test payment
5. Watch your Convex dashboard — the webhook arrives and data syncs in real time
6. Your `hasAccess` query flips to `true` automatically

## Common Patterns

### Linking Creem customers to your users

When a checkout completes, Creem creates a customer. Store the `creemCustomerId` on your user record:

```ts
// In your onCheckoutCompleted handler
onCheckoutCompleted: async (ctx, checkout) => {
  await ctx.runMutation(internal.creem.syncPayment, { checkout });

  // Link Creem customer to your user
  if (checkout.customer?.email) {
    await ctx.runMutation(internal.users.linkCreemCustomer, {
      email: checkout.customer.email,
      creemCustomerId: checkout.customer.id,
    });
  }
},
```

### One-time payments vs subscriptions

The same `syncCheckoutToDb` handles both. It checks if the checkout has a `subscription` object:

- **One-time:** Inserts a payment record only
- **Recurring:** Inserts payment + upserts subscription + upserts customer

### Handling downgrades

Use the specific subscription handlers for granular control:

```ts
onSubscriptionUpdate: async (ctx, subscription) => {
  await ctx.runMutation(internal.creem.syncSub, { subscription });
  // Check new product ID, adjust features accordingly
},

onSubscriptionScheduledCancel: async (ctx, subscription) => {
  // User canceled but still has access until period ends
  await ctx.runMutation(internal.creem.syncSub, { subscription });
  // Send retention email, show cancellation survey
},
```

### Idempotency

`logWebhookEvent` is idempotent — duplicate events with the same `id` are ignored. The `upsertCustomer` and `upsertSubscription` helpers also use upsert logic, so replayed webhooks are safe.

## Troubleshooting

### Webhook returns 401

- Verify `CREEM_WEBHOOK_SECRET` matches the secret in your Creem dashboard
- Make sure the webhook URL is correct: `https://<deployment>.convex.site/creem/webhook`
- Check that the `creem-signature` header is being sent (Creem sends this automatically)

### Webhook returns 500

- Check `CREEM_WEBHOOK_SECRET` is set in your Convex environment variables
- Look at the Convex logs for the specific error in your handler

### Data not updating in real time

- Verify your queries use the correct Creem customer ID
- Check the `creem_subscriptions` table in the Convex dashboard to see if the webhook data arrived
- Make sure your `onGrantAccess` / `onRevokeAccess` handlers call `syncSub`

### Test mode not working

- Confirm `CREEM_TEST_MODE=true` is set (string `"true"`, not boolean)
- Test mode uses `test-api.creem.io` — products and customers are separate from production

## Next Steps

- Add a [billing portal](https://docs.creem.io/api-reference/customers/billing-portal) link for self-service management
- Set up [discount codes](https://docs.creem.io) for promotions
- Explore the [Creem API docs](https://docs.creem.io) for advanced features like metered billing

## License

[MIT](LICENSE)
