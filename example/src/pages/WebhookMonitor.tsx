import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import {
  Radio,
  CheckCircle2,
  XCircle,
  CreditCard,
  Activity,
  Clock,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { useState } from "react";

const EVENT_COLORS: Record<string, string> = {
  "checkout.completed": "border-l-creem-500",
  "subscription.active": "border-l-emerald-500",
  "subscription.paid": "border-l-emerald-400",
  "subscription.trialing": "border-l-blue-500",
  "subscription.canceled": "border-l-red-500",
  "subscription.expired": "border-l-red-400",
  "subscription.paused": "border-l-amber-500",
  "subscription.past_due": "border-l-amber-400",
  "subscription.update": "border-l-purple-500",
  "refund.created": "border-l-rose-500",
  "dispute.created": "border-l-rose-600",
};

export function WebhookMonitor() {
  const events = useQuery(api.creem.getWebhookEvents, { limit: 50 }) ?? [];

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Webhook Monitor</h1>
          <p className="mt-1 text-gray-400">
            Watch Creem events arrive in real-time — powered by Convex reactivity
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 px-3 py-2 ring-1 ring-emerald-500/20">
            <div className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
            <span className="text-sm font-medium text-emerald-400">
              Listening
            </span>
          </div>
          <span className="rounded-lg bg-gray-800 px-3 py-2 text-sm text-gray-400">
            {events.length} events
          </span>
        </div>
      </div>

      {/* Connection Info */}
      <div className="card mb-8">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-creem-500/10">
            <Radio className="h-5 w-5 text-creem-400" />
          </div>
          <div>
            <h3 className="font-semibold">How it works</h3>
            <p className="mt-1 text-sm text-gray-400">
              Creem sends a webhook → Convex HTTP action verifies the signature →
              runs a mutation to store the event → every connected client sees
              the update instantly. No polling, no WebSocket setup, no
              infrastructure.
            </p>
            <div className="mt-3 flex gap-6">
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                HMAC-SHA256 verified
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Activity className="h-3.5 w-3.5 text-blue-400" />
                Idempotent processing
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Clock className="h-3.5 w-3.5 text-amber-400" />
                {"<"}50ms to UI
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Event Stream */}
      {events.length === 0 ? (
        <div className="card py-20 text-center">
          <Radio className="mx-auto mb-4 h-12 w-12 text-gray-600 animate-pulse-slow" />
          <h3 className="text-lg font-semibold text-gray-400">
            Waiting for events...
          </h3>
          <p className="mt-2 text-sm text-gray-500">
            Complete a checkout on the Pricing page to trigger webhook events.
            <br />
            They'll appear here in real-time.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {events.map((evt: any) => (
            <EventCard key={evt._id} event={evt} />
          ))}
        </div>
      )}
    </div>
  );
}

function EventCard({ event }: { event: any }) {
  const [expanded, setExpanded] = useState(false);
  const borderColor = EVENT_COLORS[event.eventType] ?? "border-l-gray-600";

  return (
    <div
      className={`card border-l-4 ${borderColor} cursor-pointer transition-all hover:bg-gray-800/30 animate-fade-in`}
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <EventTypeIcon type={event.eventType} />
          <div>
            <div className="flex items-center gap-2">
              <p className="font-mono text-sm font-semibold">
                {event.eventType}
              </p>
              <span className="badge-green">processed</span>
            </div>
            <p className="mt-0.5 text-xs text-gray-500">
              ID: {event.creemEventId}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500">
            {new Date(event.creemCreatedAt).toLocaleString()}
          </span>
          {expanded ? (
            <ChevronDown className="h-4 w-4 text-gray-500" />
          ) : (
            <ChevronRight className="h-4 w-4 text-gray-500" />
          )}
        </div>
      </div>

      {expanded && (
        <div className="mt-4 rounded-lg bg-gray-950/50 p-4">
          <p className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-500">
            Payload
          </p>
          <pre className="max-h-64 overflow-auto text-xs text-gray-400">
            {JSON.stringify(event.payload, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

function EventTypeIcon({ type }: { type: string }) {
  const cls = "h-5 w-5";
  if (type.includes("checkout")) return <CreditCard className={`${cls} text-creem-400`} />;
  if (type.includes("active") || type.includes("paid"))
    return <CheckCircle2 className={`${cls} text-emerald-400`} />;
  if (type.includes("canceled") || type.includes("expired"))
    return <XCircle className={`${cls} text-red-400`} />;
  if (type.includes("trialing")) return <Clock className={`${cls} text-blue-400`} />;
  return <Activity className={`${cls} text-gray-400`} />;
}
