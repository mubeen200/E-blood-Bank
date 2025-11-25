// src/components/layout/AdminSidebar.tsx
import {
  LayoutDashboard,
  Users,
  UserCheck,
  Activity,
  Droplet,
  BarChart3,
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";

type AdminItem = {
  id: string;
  label: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  path: string;
  disabled?: boolean;
};

const items: AdminItem[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    path: "/admin",
  },
  {
    id: "donors",
    label: "Manage Donors",
    icon: Users,
    path: "/admin/donors",
    disabled: false,
  },
  {
    id: "recipients",
    label: "Manage Recipients",
    icon: UserCheck,
    path: "/admin/recipients",
    disabled: false,
  },
  {
    id: "inventory",
    label: "Blood Inventory",
    icon: Activity,
    path: "/admin/inventory",  
    disabled: false,
  },
  {
    id: "donations",
    label: "Donation Records",
    icon: Droplet,
    path: "/admin/donations",
    disabled: false,
  },
  {
    id: "reports",
    label: "Reports & Analytics",
    icon: BarChart3,
    path: "/admin/reports",
    disabled: false,
  },
];

export function AdminSidebar() {
  const { pathname } = useLocation();

  return (
    <aside className="hidden md:flex md:flex-col w-56 shrink-0 rounded-2xl bg-gradient-to-b from-red-800 via-red-700 to-blue-800 border border-red-500/50 shadow-xl text-white p-4 gap-4 min-h-[640px]">
      <div className="text-xs uppercase tracking-wide text-red-100/80">
        Admin Portal
      </div>

      <nav className="flex flex-col gap-1 text-sm">
        {items.map((item) => {
          const Icon = item.icon;

          if (item.disabled || item.path === "#") {
            return (
              <div
                key={item.id}
                className="flex items-center gap-2 rounded-xl px-3 py-2 opacity-60 cursor-not-allowed bg-white/5 border border-transparent"
                title="Coming soon"
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </div>
            );
          }

          const isDashboard = item.path === "/admin";
          const active = isDashboard
            ? pathname === "/admin"
            : pathname.startsWith(item.path);

          return (
            <Link
              key={item.id}
              to={item.path}
              className={[
                "flex items-center gap-2 rounded-xl px-3 py-2 transition-all",
                active
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
        <div className="font-semibold mb-1">Single admin</div>
        <div className="text-[11px] text-red-100/80">
          You control donors, recipients, inventory &amp; reports for this
          system.
        </div>
      </div>
    </aside>
  );
}
