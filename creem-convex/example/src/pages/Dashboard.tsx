import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import {
  CreditCard,
  Users,
  Activity,
  Clock,
  CheckCircle2,
  XCircle,
  Pause,
  AlertTriangle,
} from "lucide-react";

const STATUS_CONFIG: Record<string, { badge: string; icon: React.ReactNode; label: string }> = {
  active: { badge: "badge-green", icon: <CheckCircle2 className="h-3.5 w-3.5" />, label: "Active" },
  trialing: { badge: "badge-blue", icon: <Clock className="h-3.5 w-3.5" />, label: "Trialing" },
  canceled: { badge: "badge-red", icon: <XCircle className="h-3.5 w-3.5" />, label: "Canceled" },
  expired: { badge: "badge-red", icon: <XCircle className="h-3.5 w-3.5" />, label: "Expired" },
  paused: { badge: "badge-yellow", icon: <Pause className="h-3.5 w-3.5" />, label: "Paused" },
  past_due: { badge: "badge-yellow", icon: <AlertTriangle className="h-3.5 w-3.5" />, label: "Past Due" },
};

export function Dashboard() {
  const users = useQuery(api.creem.listUsers) ?? [];
  const events = useQuery(api.creem.getWebhookEvents, { limit: 5 }) ?? [];

  const activeUsers = users.filter((u) => u.hasAccess).length;
  const totalRevenue = 0; // Would come from payments query

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="mt-1 text-gray-400">
          Real-time subscription data — updates automatically when webhooks arrive
        </p>
      </div>

      {/* Stats */}
      <div className="mb-8 grid gap-4 md:grid-cols-4">
        <StatCard
          icon={<Users className="h-5 w-5 text-blue-400" />}
          label="Total Users"
          value={users.length.toString()}
        />
        <StatCard
          icon={<CheckCircle2 className="h-5 w-5 text-emerald-400" />}
          label="Active Subscribers"
          value={activeUsers.toString()}
        />
        <StatCard
          icon={<CreditCard className="h-5 w-5 text-creem-400" />}
          label="Events Processed"
          value={events.length.toString()}
        />
        <StatCard
          icon={<Activity className="h-5 w-5 text-purple-400" />}
          label="Conversion Rate"
          value={users.length > 0 ? `${Math.round((activeUsers / users.length) * 100)}%` : "—"}
        />
      </div>

      {/* Users Table */}
      <div className="card mb-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Subscribers</h2>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
            <span className="text-xs text-gray-400">Live</span>
          </div>
        </div>

        {users.length === 0 ? (
          <div className="py-12 text-center text-gray-500">
            <Users className="mx-auto mb-3 h-8 w-8 opacity-50" />
            <p>No users yet. Complete a checkout to see real-time updates.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-800 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  <th className="pb-3 pr-4">User</th>
                  <th className="pb-3 pr-4">Plan</th>
                  <th className="pb-3 pr-4">Status</th>
                  <th className="pb-3">Customer ID</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/50">
                {users.map((user) => {
                  const statusKey = user.hasAccess ? "active" : "canceled";
                  const config = STATUS_CONFIG[statusKey] ?? STATUS_CONFIG.canceled;
                  return (
                    <tr key={user._id} className="animate-fade-in">
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-800 text-sm font-medium text-gray-300">
                            {user.email.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-medium">{user.name ?? user.email}</p>
                            <p className="text-xs text-gray-500">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 pr-4">
                        <span className="text-sm capitalize text-gray-300">
                          {user.plan ?? "free"}
                        </span>
                      </td>
                      <td className="py-3 pr-4">
                        <span className={config.badge}>
                          {config.icon}
                          <span className="ml-1">{config.label}</span>
                        </span>
                      </td>
                      <td className="py-3">
                        <code className="text-xs text-gray-500">
                          {user.creemCustomerId ?? "—"}
                        </code>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recent Events */}
      <div className="card">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Recent Webhook Events</h2>
          <span className="text-xs text-gray-500">{events.length} events</span>
        </div>

        {events.length === 0 ? (
          <div className="py-8 text-center text-gray-500">
            <Activity className="mx-auto mb-3 h-8 w-8 opacity-50" />
            <p>No events yet. They'll appear here in real-time.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {events.map((evt: any) => (
              <div
                key={evt._id}
                className="flex items-center justify-between rounded-lg bg-gray-800/30 px-4 py-3 animate-fade-in"
              >
                <div className="flex items-center gap-3">
                  <EventIcon type={evt.eventType} />
                  <div>
                    <p className="text-sm font-medium">{evt.eventType}</p>
                    <p className="text-xs text-gray-500">{evt.creemEventId}</p>
                  </div>
                </div>
                <span className="text-xs text-gray-500">
                  {new Date(evt.creemCreatedAt).toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="card flex items-center gap-4">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-800">
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-xs text-gray-500">{label}</p>
      </div>
    </div>
  );
}

function EventIcon({ type }: { type: string }) {
  if (type.includes("completed")) return <CreditCard className="h-4 w-4 text-creem-400" />;
  if (type.includes("active") || type.includes("paid")) return <CheckCircle2 className="h-4 w-4 text-emerald-400" />;
  if (type.includes("canceled") || type.includes("expired")) return <XCircle className="h-4 w-4 text-red-400" />;
  return <Activity className="h-4 w-4 text-gray-400" />;
}
