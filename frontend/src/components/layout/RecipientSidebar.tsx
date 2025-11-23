// src/components/layout/RecipientSidebar.tsx
import {
  LayoutDashboard,
  Droplet,
  Clock,
  AlertTriangle,
  User,
  Bell,
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";

type RecipientSidebarActive =
  | "dashboard"
  | "request"
  | "requests"
  | "emergency"
  | "profile"
  | "notifications";

interface RecipientSidebarProps {
  /** Optional override; if not passed we infer from the URL (like donor sidebar) */
  active?: RecipientSidebarActive;
}

const items: {
  id: RecipientSidebarActive;
  label: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  path: string;
}[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    path: "/recipient",
  },
  {
    id: "request",
    label: "Request Blood",
    icon: Droplet,
    path: "/recipient/request",
  },
  {
    id: "requests",
    label: "My Requests",
    icon: Clock,
    path: "/recipient/requests",
  },
  {
    id: "emergency",
    label: "Emergency Requests",
    icon: AlertTriangle,
    path: "/recipient/emergency",
  },
  {
    id: "profile",
    label: "Profile",
    icon: User,
    path: "/recipient/profile",
  },
  {
    id: "notifications",
    label: "Notifications",
    icon: Bell,
    path: "/recipient/notifications",
  },
];

export function RecipientSidebar({ active }: RecipientSidebarProps) {
  const location = useLocation();
  const pathname = location.pathname;

  return (
    <aside
      className="
        hidden md:flex md:flex-col
        w-56 shrink-0
        rounded-2xl
        bg-gradient-to-b from-red-800 via-red-700 to-blue-800
        border border-red-500/50
        shadow-xl
        text-white
        p-4 gap-4
        min-h-[640px]  /* 👈 keeps sidebar tall even if page content is short */
      "
    >
      <div className="text-xs uppercase tracking-wide text-red-100/80">
        Recipient Portal
      </div>

      <nav className="flex flex-col gap-1 text-sm">
        {items.map((item) => {
          const Icon = item.icon;

          // If parent explicitly passes `active`, use that.
          // Otherwise, infer from the URL (same logic as donor sidebar).
          const isDashboard = item.path === "/recipient";
          const routeActive = isDashboard
            ? pathname === "/recipient"
            : pathname.startsWith(item.path);

          const isActive = active ? active === item.id : routeActive;

          return (
            <Link
              key={item.id}
              to={item.path}
              className={[
                "flex items-center gap-2 rounded-xl px-3 py-2 transition-all",
                isActive
                  ? "bg-white/15 border border-white/60 shadow-md"
                  : "bg-white/5 hover:bg-white/10 border border-transparent",
              ].join(" ")}
            >
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto rounded-xl bg-black/20 border border-white/20 p-3 text-xs text-red-50">
        <div className="font-semibold mb-1">Need help?</div>
        <div className="text-[11px] text-red-100/80">
          We’ll later add FAQs &amp; contact for your blood bank here.
        </div>
      </div>
    </aside>
  );
}
