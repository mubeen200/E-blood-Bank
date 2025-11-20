import { useEffect, useMemo, useState } from "react";
import api from "@/api/axiosClient";
import { useAuth } from "@/context/AuthContext";
import { DonorSidebar } from "@/components/layout/DonorSidebar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  CalendarDays,
  Droplet,
  LineChart,
  ShieldAlert,
  Sparkles,
} from "lucide-react";

type Overview = {
  eligibility: {
    eligible: boolean;
    reasons: string[];
  };
  nextEligibleDonationDate: string | null;
  stats: {
    totalDonations: number;
    upcomingAppointments: number;
  };
};

type Appointment = {
  _id: string;
  date: string;
  timeSlot: string;
  status: "SCHEDULED" | "COMPLETED" | "CANCELLED";
  location?: {
    _id: string;
    name: string;
    city?: string;
  } | null;
};

export function DonorDashboard() {
  const { user } = useAuth();

  const [overview, setOverview] = useState<Overview | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // --------- data loading (fixed) ----------
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [overviewRes, apptsRes] = await Promise.allSettled([
          api.get("/donor/overview"),
          api.get("/donor/appointments"),
        ]);

        let anySuccess = false;

        if (overviewRes.status === "fulfilled") {
          setOverview(overviewRes.value.data);
          anySuccess = true;
        } else {
          console.error(
            "Dashboard overview error:",
            overviewRes.reason || overviewRes
          );
        }

        if (apptsRes.status === "fulfilled") {
          setAppointments(apptsRes.value.data.appointments || []);
          anySuccess = true;
        } else {
          console.error(
            "Dashboard appointments error:",
            apptsRes.reason || apptsRes
          );
        }

        // Only show toast if *everything* failed:
        if (!anySuccess) {
          toast.error("Failed to load donor dashboard.");
        }
      } catch (err: any) {
        console.error("Donor dashboard fatal error:", err);
        toast.error("Failed to load donor dashboard.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  // --------- helpers ----------
  const formatDate = (value: string) =>
    new Date(value).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

  const monthlyTrend = useMemo(() => {
    const map = new Map<string, number>();

    appointments
      .filter((a) => a.status === "COMPLETED")
      .forEach((a) => {
        const d = new Date(a.date);
        const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
        map.set(key, (map.get(key) || 0) + 1);
      });

    const sorted = Array.from(map.entries())
      .sort((a, b) => (a[0] < b[0] ? -1 : 1))
      .slice(-6);

    return sorted.map(([key, count]) => {
      const [yearStr, monthStr] = key.split("-");
      const year = Number(yearStr);
      const month = Number(monthStr);
      const label = new Date(year, month - 1, 1).toLocaleDateString(
        undefined,
        {
          month: "short",
        }
      );
      return { label, count };
    });
  }, [appointments]);

  const maxMonthly = monthlyTrend.reduce(
    (max, d) => (d.count > max ? d.count : max),
    1
  );

  const totalDonations = overview?.stats.totalDonations ?? 0;
  const impact = totalDonations * 3;

  const nextEligibleText = overview?.nextEligibleDonationDate
    ? formatDate(overview.nextEligibleDonationDate)
    : "Not set yet";

  const eligible = overview?.eligibility.eligible ?? false;
  const reasons = overview?.eligibility.reasons ?? [];

  // --------- UI ----------
  return (
    <div className="flex gap-6">
      <DonorSidebar />

      <div className="flex-1 space-y-6">
        {/* Header */}
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">
            Welcome back, {user?.name || "Donor"}{" "}
            <span role="img" aria-label="wave">
              👋
            </span>
          </h1>
          <p className="text-sm text-slate-300">
            This is your personal donor hub. Track your impact, see your
            badges, and stay ready for the next life-saving donation.
          </p>
        </div>

        {/* Top stats */}
        <section className="grid gap-4 lg:grid-cols-4">
          {/* Eligibility */}
          <Card className="p-4 bg-red-900/70 border-red-600 text-white">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs font-semibold uppercase">
                Eligibility
              </div>
              <ShieldAlert className="h-4 w-4 text-red-200" />
            </div>
            <div className="text-sm font-semibold mb-1">
              {eligible ? "Currently eligible" : "Not currently eligible"}
            </div>
            <ul className="text-[11px] space-y-1 text-red-100/90">
              {reasons.length === 0 ? (
                <li>• No issues detected with your saved data.</li>
              ) : (
                reasons.map((r, idx) => <li key={idx}>• {r}</li>)
              )}
            </ul>
          </Card>

          {/* Next eligible date */}
          <Card className="p-4 bg-slate-900/90 border-slate-700 text-white">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs font-semibold uppercase">
                Next eligible donation
              </div>
              <CalendarDays className="h-4 w-4 text-blue-200" />
            </div>
            <div className="text-sm font-semibold mb-1">{nextEligibleText}</div>
            <p className="text-[11px] text-slate-300">
              This date updates automatically after every completed donation.
            </p>
          </Card>

          {/* Total donations */}
          <Card className="p-4 bg-slate-900/90 border-slate-700 text-white">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs font-semibold uppercase">
                Total donations
              </div>
              <Droplet className="h-4 w-4 text-red-300" />
            </div>
            <div className="text-2xl font-bold">{totalDonations}</div>
            <p className="text-[11px] text-slate-300 mt-1">
              Units donated: {totalDonations}
            </p>
          </Card>

          {/* Impact */}
          <Card className="p-4 bg-gradient-to-br from-purple-700 to-blue-700 border-none text-white">
            <div className="text-xs font-semibold uppercase mb-2">
              Impact estimate
            </div>
            <div className="text-2xl font-bold flex items-baseline gap-1">
              {impact}
              <span className="text-xs font-normal">lives</span>
            </div>
            <p className="text-[11px] text-purple-100 mt-1">
              Approximate lives touched (assuming 3 lives per unit).
            </p>
          </Card>
        </section>

        {/* Badges + trend */}
        <section className="grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
          {/* Badges */}
          <Card className="p-4 bg-slate-900/90 border-slate-700 text-white">
            <div className="flex items-center justify-between mb-2">
              <div>
                <div className="text-xs font-semibold uppercase">
                  Your badges
                </div>
                <p className="text-[11px] text-slate-300">
                  Earn new milestones as you keep donating.
                </p>
              </div>
              <div className="flex items-center gap-1 text-xs text-slate-300">
                <Sparkles className="h-3 w-3 text-yellow-300" />
                <span>{Math.min(totalDonations, 4)}/4 earned</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-2">
              {/* First Donation */}
              <div className="rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-3 flex flex-col justify-between">
                <div className="text-xs font-semibold mb-1">
                  First Donation
                </div>
                <p className="text-[11px] text-slate-300">
                  Complete your very first blood donation.
                </p>
                <div className="mt-2 text-[10px] text-slate-400">
                  Unlock at 1 donation
                </div>
              </div>

              {/* Bronze */}
              <div className="rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-3 flex flex-col justify-between">
                <div className="text-xs font-semibold mb-1">
                  Bronze Donor
                </div>
                <p className="text-[11px] text-slate-300">
                  5 successful donations recorded.
                </p>
                <div className="mt-2 text-[10px] text-slate-400">
                  Unlock at 5 donations
                </div>
              </div>

              {/* Silver */}
              <div className="rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-3 flex flex-col justify-between">
                <div className="text-xs font-semibold mb-1">
                  Silver Donor
                </div>
                <p className="text-[11px] text-slate-300">
                  10+ donations — a consistent life saver.
                </p>
                <div className="mt-2 text-[10px] text-slate-400">
                  Unlock at 10 donations
                </div>
              </div>

              {/* Gold */}
              <div className="rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-3 flex flex-col justify-between">
                <div className="text-xs font-semibold mb-1">
                  Gold Hero
                </div>
                <p className="text-[11px] text-slate-300">
                  20+ donations — a true community hero.
                </p>
                <div className="mt-2 text-[10px] text-slate-400">
                  Unlock at 20 donations
                </div>
              </div>
            </div>
          </Card>

          {/* Donation trend */}
          <Card className="p-4 bg-slate-900/90 border-slate-700 text-white">
            <div className="flex items-center justify-between mb-2">
              <div>
                <div className="text-xs font-semibold uppercase">
                  Donation trend
                </div>
                <p className="text-[11px] text-slate-300">
                  Month-wise count of your recent donations.
                </p>
              </div>
              <LineChart className="h-4 w-4 text-blue-200" />
            </div>

            {monthlyTrend.length === 0 ? (
              <p className="text-xs text-slate-400 mt-2">
                No donation statistics yet. Once donations are recorded, your
                activity will appear here.
              </p>
            ) : (
              <div className="mt-3 space-y-2">
                {monthlyTrend.map((m) => (
                  <div
                    key={m.label}
                    className="flex items-center gap-2 text-xs"
                  >
                    <div className="w-8 text-right text-slate-300">
                      {m.label}
                    </div>
                    <div className="flex-1 h-3 rounded-full bg-slate-950 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-red-500 via-pink-500 to-blue-500"
                        style={{
                          width: `${(m.count / maxMonthly) * 100}%`,
                        }}
                      />
                    </div>
                    <div className="w-6 text-left text-slate-200">
                      {m.count}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </section>

        {/* Matching recipient requests – placeholder (no API yet) */}
        <section>
          <Card className="p-4 bg-slate-900/90 border-slate-700 text-white">
            <div className="flex items-center justify-between mb-1">
              <div className="text-xs font-semibold uppercase">
                Matching recipient requests
              </div>
              <span className="text-[10px] uppercase text-slate-400">
                Coming soon
              </span>
            </div>
            <p className="text-[11px] text-slate-300">
              Later we’ll connect your blood type to real-time patient
              requests. For now, this area gives you a quick summary once that
              feature is live.
            </p>
            <div className="mt-3">
              <Button
                type="button"
                size="sm"
                disabled
                className="bg-red-600/70 hover:bg-red-600 cursor-not-allowed"
              >
                View matching requests (soon)
              </Button>
            </div>
          </Card>
        </section>
      </div>
    </div>
  );
}
