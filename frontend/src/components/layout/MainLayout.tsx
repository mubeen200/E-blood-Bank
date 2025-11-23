import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Footer } from "./Footer";
import { Toaster } from "sonner";
import { useAuth } from "@/context/AuthContext";

type MainLayoutProps = {
  children: ReactNode;
};

export function MainLayout({ children }: MainLayoutProps) {
  const location = useLocation();
  const { user, logout } = useAuth();

  const isAuthenticated = !!user;

  const isActive = (path: string) =>
    location.pathname === path ||
    (path !== "/" && location.pathname.startsWith(path));

  const navLinkClasses = (path: string) =>
    [
      "text-sm font-medium transition-colors",
      isActive(path)
        ? "text-white"
        : "text-slate-100/80 hover:text-white/90",
    ].join(" ");

  const notificationPath = !user
    ? "/login"
    : user.role === "DONOR"
    ? "/donor/notifications"
    : user.role === "RECIPIENT"
    ? "/recipient/notifications"
    : "/";

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-white">
      <header className="border-b border-slate-800 bg-gradient-to-r from-red-700 via-red-600 to-blue-700">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 gap-4">
          {/* Logo + brand */}
          <Link
            to={
              isAuthenticated && user?.role === "DONOR"
                ? "/donor"
                : isAuthenticated && user?.role === "RECIPIENT"
                ? "/recipient"
                : "/"
            }
            className="flex items-center gap-3"
          >
            <img
              src="/logo.png"
              alt="E-BloodBank Logo"
              className="h-9 w-9 rounded-full border border-white/40 bg-white/90 object-contain shadow-sm"
            />
            <span className="text-lg font-semibold tracking-tight">
              E-BloodBank
            </span>
          </Link>

          {/* Center links: only for visitors (not logged in) */}
          {!isAuthenticated && (
            <div className="hidden md:flex items-center gap-6">
              <Link to="/" className={navLinkClasses("/")}>
                Home
              </Link>
              <Link to="/about" className={navLinkClasses("/about")}>
                About Us
              </Link>
              <Link
                to="/how-it-works"
                className={navLinkClasses("/how-it-works")}
              >
                How It Works
              </Link>
              <Link
                to="/compatibility-chart"
                className={navLinkClasses("/compatibility-chart")}
              >
                Compatibility Chart
              </Link>
            </div>
          )}

          {/* Right side actions */}
          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <>
                {/* Notification bell → opens correct notifications page */}
                <Link
                  to={notificationPath}
                  className="relative rounded-full bg-white/10 p-2 hover:bg-white/20 border border-white/30"
                  aria-label="Notifications"
                >
                  <Bell className="h-4 w-4" />
                  <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-amber-400 border border-slate-900" />
                </Link>

                <Button
                  onClick={logout}
                  className="bg-slate-900/80 hover:bg-slate-900 text-white border border-white/60"
                >
                  Logout
                </Button>
              </>
            ) : (
              <>
                <Button
                  asChild
                  variant="outline"
                  className="hidden sm:inline-flex border-white/60 bg-white/10 text-white hover:bg-white/20"
                >
                  <Link to="/register-donor">Become a Donor</Link>
                </Button>

                <Button
                  asChild
                  variant="outline"
                  className="hidden sm:inline-flex border-blue-200 bg-blue-500/80 text-white hover:bg-blue-500"
                >
                  <Link to="/register-recipient">Request Blood</Link>
                </Button>

                <Button
                  asChild
                  className="bg-slate-900/80 hover:bg-slate-900 text-white border border-white/50"
                >
                  <Link to="/login">Sign In</Link>
                </Button>
              </>
            )}
          </div>
        </nav>
      </header>

      <main className="flex-1">
        <div className="mx-auto max-w-6xl px-4 py-8">{children}</div>
      </main>

      <Footer />
      <Toaster richColors position="top-right" />
    </div>
  );
}
