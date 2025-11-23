import {
  LayoutDashboard,
  Droplet,
  History,
  ShieldCheck,
  User,
  Bell,
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";

const items = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    path: "/donor",
  },
  {
    id: "donate",
    label: "Donate Blood",
    icon: Droplet,
    path: "/donor/donate",
  },
  {
    id: "history",
    label: "My Donations",
    icon: History,
    path: "/donor/history",
  },
  {
    id: "eligibility",
    label: "Eligibility Checker",
    icon: ShieldCheck,
    path: "/donor/eligibility",
  },
  {
    id: "profile",
    label: "Profile",
    icon: User,
    path: "/donor/profile", 
    disabled: false,
  },
  {
    id: "notifications",
    label: "Notifications",
    icon: Bell,
    path: "/donor/notifications",
    disabled: false,
  },
];

export function DonorSidebar() {
  const location = useLocation();
  const pathname = location.pathname;

  return (
    <aside className="hidden md:flex md:flex-col w-56 shrink-0 rounded-2xl bg-gradient-to-b from-red-800 via-red-700 to-blue-800 border border-red-500/50 shadow-xl text-white p-4 gap-4">
      <div className="text-xs uppercase tracking-wide text-red-100/80">
        Donor Portal
      </div>

      <nav className="flex flex-col gap-1 text-sm">
        {items.map((item) => {
          const Icon = item.icon;

          if (item.disabled && item.path === "#") {
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

          const isDashboard = item.path === "/donor";
          const active = isDashboard
            ? pathname === "/donor"
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
        <div className="font-semibold mb-1">Need help?</div>
        <div className="text-[11px] text-red-100/80">
          We’ll later add FAQs & contact for your blood bank here.
        </div>
      </div>
    </aside>
  );
}
