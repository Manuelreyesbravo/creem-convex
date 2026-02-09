import { useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useState } from "react";
import {
  Check,
  Sparkles,
  Zap,
  Shield,
  ArrowRight,
  RefreshCcw,
} from "lucide-react";

const plans = [
  {
    name: "Starter",
    price: "$9",
    period: "/month",
    description: "For side projects and experiments",
    features: [
      "1,000 API calls/month",
      "Basic analytics",
      "Community support",
      "1 project",
    ],
    cta: "Start Free Trial",
    popular: false,
    productId: "prod_starter", // replace with real Creem product ID
  },
  {
    name: "Pro",
    price: "$29",
    period: "/month",
    description: "For growing SaaS businesses",
    features: [
      "50,000 API calls/month",
      "Advanced analytics",
      "Priority support",
      "Unlimited projects",
      "Custom webhooks",
      "Team collaboration",
    ],
    cta: "Get Started",
    popular: true,
    productId: "prod_pro",
  },
  {
    name: "Enterprise",
    price: "$99",
    period: "/month",
    description: "For teams that need everything",
    features: [
      "Unlimited API calls",
      "Real-time dashboard",
      "Dedicated support",
      "Unlimited everything",
      "Custom integrations",
      "SLA guarantee",
      "SSO & audit logs",
    ],
    cta: "Contact Sales",
    popular: false,
    productId: "prod_enterprise",
  },
];

export function Landing() {
  const createCheckout = useAction(api.creem.createCheckout);
  const [loading, setLoading] = useState<string | null>(null);

  const handleCheckout = async (productId: string) => {
    setLoading(productId);
    try {
      const result = await createCheckout({
        productId,
        successUrl: window.location.origin + "?success=true",
        metadata: { source: "demo-landing" },
      });
      if (result?.checkoutUrl) {
        window.location.href = result.checkoutUrl;
      }
    } catch (err) {
      console.error("Checkout failed:", err);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-6 py-20">
      {/* Hero */}
      <div className="mb-20 text-center animate-fade-in">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-creem-500/30 bg-creem-500/10 px-4 py-1.5 text-sm text-creem-400">
          <Sparkles className="h-4 w-4" />
          Powered by creem-convex
        </div>
        <h1 className="mb-6 text-5xl font-bold tracking-tight md:text-7xl">
          Payments that
          <br />
          <span className="bg-gradient-to-r from-creem-400 to-amber-300 bg-clip-text text-transparent">
            update in real-time
          </span>
        </h1>
        <p className="mx-auto max-w-2xl text-lg text-gray-400">
          Accept payments with Creem, sync to Convex, and watch your UI update
          instantly. No polling. No websockets. Just reactive magic.
        </p>

        <div className="mt-10 flex items-center justify-center gap-4">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <RefreshCcw className="h-4 w-4 text-creem-500 animate-spin" style={{ animationDuration: "3s" }} />
            Real-time subscription status
          </div>
          <div className="h-4 w-px bg-gray-700" />
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Shield className="h-4 w-4 text-emerald-500" />
            HMAC-SHA256 verified webhooks
          </div>
          <div className="h-4 w-px bg-gray-700" />
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Zap className="h-4 w-4 text-amber-500" />
            Zero-config schema
          </div>
        </div>
      </div>

      {/* Pricing Cards */}
      <div className="grid gap-6 md:grid-cols-3 animate-slide-up">
        {plans.map((plan) => (
          <div
            key={plan.name}
            className={plan.popular ? "card-highlight relative" : "card"}
          >
            {plan.popular && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="rounded-full bg-creem-500 px-4 py-1 text-xs font-bold text-white shadow-lg shadow-creem-500/30">
                  MOST POPULAR
                </span>
              </div>
            )}

            <div className="mb-6">
              <h3 className="text-xl font-bold">{plan.name}</h3>
              <p className="mt-1 text-sm text-gray-400">{plan.description}</p>
            </div>

            <div className="mb-6">
              <span className="text-4xl font-bold">{plan.price}</span>
              <span className="text-gray-400">{plan.period}</span>
            </div>

            <ul className="mb-8 space-y-3">
              {plan.features.map((f) => (
                <li key={f} className="flex items-start gap-3 text-sm text-gray-300">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-creem-400" />
                  {f}
                </li>
              ))}
            </ul>

            <button
              onClick={() => handleCheckout(plan.productId)}
              disabled={loading === plan.productId}
              className={
                plan.popular
                  ? "btn-primary w-full"
                  : "btn-secondary w-full"
              }
            >
              {loading === plan.productId ? (
                <RefreshCcw className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  {plan.cta}
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        ))}
      </div>

      {/* Code Preview */}
      <div className="mt-20 animate-slide-up">
        <h2 className="mb-6 text-center text-2xl font-bold">
          3 lines to add payments to Convex
        </h2>
        <div className="card overflow-hidden">
          <div className="flex items-center gap-2 border-b border-gray-800 px-4 py-3">
            <div className="h-3 w-3 rounded-full bg-red-500/60" />
            <div className="h-3 w-3 rounded-full bg-yellow-500/60" />
            <div className="h-3 w-3 rounded-full bg-green-500/60" />
            <span className="ml-2 text-xs text-gray-500">convex/schema.ts</span>
          </div>
          <pre className="overflow-x-auto p-6 text-sm">
            <code className="text-gray-300">
              <span className="text-purple-400">import</span>{" "}
              {"{ creemTables }"}{" "}
              <span className="text-purple-400">from</span>{" "}
              <span className="text-creem-400">"creem-convex/schema"</span>;
              {"\n\n"}
              <span className="text-purple-400">export default</span>{" "}
              <span className="text-blue-400">defineSchema</span>({"{"}{"\n"}
              {"  "}...creemTables,{" "}
              <span className="text-gray-500">
                {"// ← 4 tables, all indexes, done"}
              </span>
              {"\n"}
              {"  "}
              <span className="text-gray-500">{"// ...your tables"}</span>
              {"\n"}
              {"}"});
            </code>
          </pre>
        </div>
      </div>
    </div>
  );
}
