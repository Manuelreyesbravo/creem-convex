// ============================================================
// React Hooks — real-time Creem data via Convex reactivity
// ============================================================
import { useQuery, useAction } from "convex/react";
import { useState, useCallback } from "react";
import type { FunctionReference } from "convex/server";

/**
 * Hook: Get subscription status in real-time.
 * Updates automatically when webhook changes the status.
 *
 * ```tsx
 * const sub = useCreemSubscription(api.creem.getSubscriptionByCustomer, {
 *   creemCustomerId: "cust_xxx"
 * });
 * // sub updates in REAL TIME when webhook arrives
 * ```
 */
export function useCreemSubscription(
  queryRef: FunctionReference<"query">,
  args: Record<string, unknown>
) {
  const subscription = useQuery(queryRef, args);
  return subscription;
}

/**
 * Hook: Check if user has active access.
 * Real-time boolean check.
 *
 * ```tsx
 * const { hasAccess, status } = useCreemAccess(api.creem.hasActiveSubscription, {
 *   creemCustomerId: "cust_xxx"
 * });
 * ```
 */
export function useCreemAccess(
  queryRef: FunctionReference<"query">,
  args: Record<string, unknown>
) {
  const result = useQuery(queryRef, args);
  return result ?? { hasAccess: false, status: null };
}

/**
 * Hook: Create a checkout session and redirect.
 *
 * ```tsx
 * const { startCheckout, isLoading } = useCreemCheckout(api.creem.createCheckout);
 *
 * <button onClick={() => startCheckout({
 *   productId: "prod_xxx",
 *   successUrl: "/success"
 * })}>
 *   Buy Now
 * </button>
 * ```
 */
export function useCreemCheckout(actionRef: FunctionReference<"action">) {
  const createCheckout = useAction(actionRef);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startCheckout = useCallback(
    async (args: {
      productId: string;
      successUrl: string;
      metadata?: Record<string, unknown>;
      customerEmail?: string;
    }) => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await createCheckout(args);
        if (result?.checkoutUrl) {
          window.location.href = result.checkoutUrl;
        }
        return result;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Checkout failed";
        setError(msg);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [createCheckout]
  );

  return { startCheckout, isLoading, error };
}

/**
 * Hook: List payments in real-time.
 *
 * ```tsx
 * const payments = useCreemPayments(api.creem.getPaymentsByCustomer, {
 *   creemCustomerId: "cust_xxx"
 * });
 * ```
 */
export function useCreemPayments(
  queryRef: FunctionReference<"query">,
  args: Record<string, unknown>
) {
  return useQuery(queryRef, args) ?? [];
}
