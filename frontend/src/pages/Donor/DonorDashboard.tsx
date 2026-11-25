import { useEffect, useMemo, useState } from "react";
import api from "@/api/axiosClient";
import { useAuth } from "@/context/AuthContext";
import { DonorSidebar } from "@/components/layout/DonorSidebar";
import { Card } from "@/components/ui/card";
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
    totalUnitsDonated?: number;
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

  // --------- data loading ---------- //
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

  // --------- helpers ---------- //
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
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
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

  // --- badge logic --- //
  const badges = [
    {
      id: "first",
      title: "First Donation",
      description: "Complete your very first blood donation.",
      threshold: 1,
    },
    {
      id: "bronze",
      title: "Bronze Donor",
      description: "Reach 5 successful donations.",
      threshold: 5,
    },
    {
      id: "silver",
      title: "Silver Donor",
      description: "Hit 10+ donations – a consistent life saver.",
      threshold: 10,
    },
    {
      id: "gold",
      title: "Gold Hero",
      description: "20+ donations – a true community hero.",
      threshold: 20,
    },
  ];

  const earnedCount = badges.filter(
    (b) => totalDonations >= b.threshold
  ).length;

  // --------- UI ---------- //
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
          <Card
            className={[
              "p-4 text-white",
              eligible
                ? "bg-emerald-900/80 border border-emerald-500"
                : "bg-red-900/80 border border-red-600",
            ].join(" ")}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs font-semibold uppercase">
                Eligibility
              </div>
              <ShieldAlert
                className={
                  "h-4 w-4 " +
                  (eligible ? "text-emerald-200" : "text-red-200")
                }
              />
            </div>
            <div className="text-sm font-semibold mb-1">
              {eligible
                ? "You are currently eligible to donate"
                : "Not currently eligible to donate"}
            </div>

            {eligible ? (
              <p className="text-[11px] text-emerald-100/90">
                Your saved details look good. You can book a donation
                appointment on a suitable date.
              </p>
            ) : (
              <ul className="text-[11px] space-y-1 text-red-100/90">
                {reasons.length === 0 ? (
                  <li>• Please review your profile details and health.</li>
                ) : (
                  reasons.map((r, idx) => <li key={idx}>• {r}</li>)
                )}
              </ul>
            )}
          </Card>

          {/* Next eligible date */}
          <Card className="p-4 bg-slate-900/90 border-slate-700 text-white">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs font-semibold uppercase">
                Next eligible donation
              </div>
              <CalendarDays className="h-4 w-4 text-blue-200" />
            </div>
            <div className="text-sm font-semibold mb-1">
              {nextEligibleText}
            </div>
            <p className="text-[11px] text-slate-300">
              This date updates automatically after every completed
              donation.
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
              Units donated: {overview?.stats.totalUnitsDonated ?? totalDonations}
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
                  Unlock milestones as you keep donating.
                </p>
              </div>
              <div className="flex items-center gap-1 text-xs text-slate-300">
                <Sparkles className="h-3 w-3 text-yellow-300" />
                <span>
                  {earnedCount}/{badges.length} earned
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-2">
              {badges.map((badge) => {
                const unlocked = totalDonations >= badge.threshold;
                return (
                  <div
                    key={badge.id}
                    className={[
                      "rounded-xl px-3 py-3 flex flex-col justify-between border",
                      unlocked
                        ? "border-amber-400 bg-amber-500/10 shadow-[0_0_0_1px_rgba(251,191,36,0.3)]"
                        : "border-slate-700 bg-slate-950/70 opacity-80",
                    ].join(" ")}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="text-xs font-semibold">
                        {badge.title}
                      </div>
                      <span
                        className={[
                          "text-[10px] px-2 py-0.5 rounded-full border",
                          unlocked
                            ? "border-amber-300 text-amber-200 bg-amber-500/10"
                            : "border-slate-500 text-slate-300 bg-slate-700/30",
                        ].join(" ")}
                      >
                        {unlocked ? "Unlocked" : "Locked"}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300">
                      {badge.description}
                    </p>
                    <div className="mt-2 text-[10px] text-slate-400">
                      Unlock at {badge.threshold} donation
                      {badge.threshold > 1 ? "s" : ""}
                    </div>
                  </div>
                );
              })}
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
                No donation statistics yet. Once donations are recorded,
                your activity will appear here.
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
        {/* Bottom "coming soon" section removed for a cleaner dashboard */}
      </div>
    </div>
  );
}
