import { useState } from "react";
import { Landing } from "./pages/Landing";
import { Dashboard } from "./pages/Dashboard";
import { WebhookMonitor } from "./pages/WebhookMonitor";
import { Zap, LayoutDashboard, Radio, IceCream2 } from "lucide-react";

type Page = "landing" | "dashboard" | "webhooks";

export default function App() {
  const [page, setPage] = useState<Page>("landing");

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 border-b border-gray-800 bg-gray-950/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-creem-500">
              <IceCream2 className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-bold">
              creem<span className="text-creem-400">-convex</span>
            </span>
            <span className="badge-blue ml-2">demo</span>
          </div>

          <div className="flex items-center gap-1 rounded-xl bg-gray-900 p-1">
            <NavTab
              active={page === "landing"}
              onClick={() => setPage("landing")}
              icon={<Zap className="h-4 w-4" />}
              label="Pricing"
            />
            <NavTab
              active={page === "dashboard"}
              onClick={() => setPage("dashboard")}
              icon={<LayoutDashboard className="h-4 w-4" />}
              label="Dashboard"
            />
            <NavTab
              active={page === "webhooks"}
              onClick={() => setPage("webhooks")}
              icon={<Radio className="h-4 w-4" />}
              label="Webhooks"
            />
          </div>
        </div>
      </nav>

      {/* Pages */}
      <main>
        {page === "landing" && <Landing />}
        {page === "dashboard" && <Dashboard />}
        {page === "webhooks" && <WebhookMonitor />}
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-800 py-8 text-center text-sm text-gray-500">
        Built with{" "}
        <a href="https://convex.dev" className="text-creem-400 hover:underline">
          Convex
        </a>{" "}
        +{" "}
        <a href="https://creem.io" className="text-creem-400 hover:underline">
          Creem
        </a>{" "}
        — Real-time payments, zero polling
      </footer>
    </div>
  );
}

function NavTab({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
        active
          ? "bg-gray-800 text-white shadow-sm"
          : "text-gray-400 hover:text-gray-200"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
