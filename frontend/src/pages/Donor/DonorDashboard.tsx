import { useEffect, useState } from "react";
import api from "@/api/axiosClient";
import { Card } from "@/components/ui/card";
import { DonorSidebar } from "@/components/layout/DonorSidebar";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import {
  Award,
  Medal,
  ShieldCheck,
  Crown,
  Flame,
  AlertTriangle,
} from "lucide-react";

type Overview = {
  eligibility: {
    eligible: boolean;
    reasons: string[];
  };
  nextEligibleDonationDate: string | null;
  totalDonations: number;
  totalUnitsDonated: number;
  impactCount: number;
  lastDonation: {
    date: string;
    units: number;
    status: string;
    locationName: string;
    locationCity: string;
  } | null;
};

type DonationStat = {
  label: string;
  count: number;
};

type MatchingRequest = {
  _id: string;
  createdAt: string;
  bloodType: string;
  units: number;
  urgency: "LOW" | "MEDIUM" | "HIGH";
  recipientName: string;
  locationName: string;
  locationCity?: string;
};

const BADGES = [
  {
    id: "first",
    label: "First Donation",
    threshold: 1,
    description: "Completed your very first blood donation.",
    icon: Award,
    colors: "from-emerald-400 to-emerald-600",
  },
  {
    id: "bronze",
    label: "Bronze Donor",
    threshold: 5,
    description: "5 successful donations recorded.",
    icon: Medal,
    colors: "from-amber-400 to-orange-500",
  },
  {
    id: "silver",
    label: "Silver Donor",
    threshold: 10,
    description: "10 donations — a consistent life saver.",
    icon: ShieldCheck,
    colors: "from-slate-200 to-slate-400",
  },
  {
    id: "gold",
    label: "Gold Hero",
    threshold: 20,
    description: "20+ donations. A true community hero.",
    icon: Crown,
    colors: "from-yellow-300 to-yellow-500",
  },
];

export function DonorDashboard() {
  const { user } = useAuth();
  const [overview, setOverview] = useState<Overview | null>(null);
  const [stats, setStats] = useState<DonationStat[]>([]);
  const [matchingRequests, setMatchingRequests] = useState<MatchingRequest[]>(
    []
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [ovRes, statsRes, matchRes] = await Promise.all([
          api.get("/donor/overview"),
          api.get("/donor/stats/donations"),
          api.get("/donor/matching-requests"),
        ]);

        setOverview(ovRes.data);
        setStats(statsRes.data.data || []);
        setMatchingRequests(matchRes.data.matches || []);
      } catch (err: any) {
        console.error(err);
        if (err?.response?.status === 401) {
          toast.error("Session expired. Please sign in again.");
        } else {
          toast.error("Failed to load donor dashboard.");
        }
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const totalDonations = overview?.totalDonations ?? 0;
  const maxCount = stats.reduce((m, s) => Math.max(m, s.count), 0) || 1;

  const formatDate = (value?: string | null) => {
    if (!value) return "-";
    return new Date(value).toLocaleDateString();
  };

  const formatUrgency = (u: string) => {
    if (u === "HIGH") return "High";
    if (u === "MEDIUM") return "Medium";
    return "Low";
  };

  const urgencyPillClasses = (u: string) => {
    if (u === "HIGH")
      return "bg-red-500/20 text-red-200 border-red-400/60";
    if (u === "MEDIUM")
      return "bg-amber-500/20 text-amber-200 border-amber-400/60";
    return "bg-emerald-500/20 text-emerald-200 border-emerald-400/60";
  };

  const earnedBadges = BADGES.filter((b) => totalDonations >= b.threshold);
  const notEarnedBadges = BADGES.filter((b) => totalDonations < b.threshold);

  return (
    <div className="flex gap-6">
      {/* Sidebar */}
      <DonorSidebar />

      {/* Main area */}
      <div className="flex-1 space-y-6">
        {/* Header */}
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">
            Welcome back{user ? `, ${user.name}` : ""} 👋
          </h1>
          <p className="text-sm text-slate-300">
            This is your personal donor hub. Track your impact, see your badges,
            and stay ready for the next life-saving donation.
          </p>
        </div>

        {/* Top cards */}
        <section className="grid gap-4 md:grid-cols-4">
          <Card className="p-4 bg-gradient-to-br from-red-700/90 to-red-500/90 border-red-400/60 text-white shadow-lg">
            <div className="text-xs uppercase tracking-wide text-red-100/90">
              Eligibility
            </div>
            <div className="mt-2 text-sm font-semibold flex items-center gap-2">
              {overview?.eligibility.eligible ? (
                <>
                  <ShieldCheck className="h-4 w-4 text-emerald-200" />
                  Eligible to donate
                </>
              ) : (
                <>
                  <AlertTriangle className="h-4 w-4 text-yellow-200" />
                  Not currently eligible
                </>
              )}
            </div>
            <ul className="mt-2 text-[11px] text-red-50/90 list-disc list-inside space-y-1">
              {overview?.eligibility.reasons && overview.eligibility.reasons.length > 0 ? (
                overview.eligibility.reasons.map((r, i) => <li key={i}>{r}</li>)
              ) : (
                <li>No issues detected with your saved data.</li>
              )}
            </ul>
          </Card>

          <Card className="p-4 bg-slate-900/90 border-slate-700 text-white shadow-lg">
            <div className="text-xs uppercase tracking-wide text-slate-300">
              Next eligible donation
            </div>
            <div className="mt-2 text-lg font-semibold">
              {overview?.nextEligibleDonationDate
                ? formatDate(overview.nextEligibleDonationDate)
                : "Not set yet"}
            </div>
            <p className="mt-2 text-[11px] text-slate-300">
              This date updates automatically after every completed donation.
            </p>
          </Card>

          <Card className="p-4 bg-slate-900/90 border-slate-700 text-white shadow-lg">
            <div className="text-xs uppercase tracking-wide text-slate-300">
              Total donations
            </div>
            <div className="mt-2 text-3xl font-bold flex items-baseline gap-1">
              {totalDonations}
              <span className="text-xs font-normal text-slate-300">
                times
              </span>
            </div>
            <div className="mt-1 text-[11px] text-slate-300">
              Units donated:{" "}
              <span className="font-semibold">
                {overview?.totalUnitsDonated ?? 0}
              </span>
            </div>
          </Card>

          <Card className="p-4 bg-gradient-to-br from-blue-700/90 to-purple-600/90 border-blue-400/70 text-white shadow-lg">
            <div className="text-xs uppercase tracking-wide text-blue-100/90">
              Impact estimate
            </div>
            <div className="mt-2 text-3xl font-bold flex items-center gap-2">
              {overview?.impactCount ?? 0}
              <Flame className="h-5 w-5 text-amber-200" />
            </div>
            <p className="mt-1 text-[11px] text-blue-100/90">
              Approximate lives touched (assuming 3 lives per unit).
            </p>
          </Card>
        </section>

        {/* Badges section */}
        <section className="grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
          <Card className="p-5 bg-slate-900/95 border-slate-700 text-white shadow-xl">
            <div className="flex items-center justify-between gap-2 mb-3">
              <div>
                <h2 className="text-sm font-semibold">Your badges</h2>
                <p className="text-[11px] text-slate-300">
                  Earn new milestones as you keep donating.
                </p>
              </div>
              <div className="text-[11px] text-slate-400">
                {earnedBadges.length}/{BADGES.length} earned
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              {BADGES.map((badge) => {
                const Icon = badge.icon;
                const earned = totalDonations >= badge.threshold;
                return (
                  <div
                    key={badge.id}
                    className={[
                      "relative overflow-hidden rounded-2xl border p-3 flex gap-3 items-center shadow-md",
                      earned
                        ? `border-emerald-300/70 bg-gradient-to-br ${badge.colors}`
                        : "border-slate-700 bg-slate-900/90",
                    ].join(" ")}
                  >
                    <div
                      className={[
                        "flex h-12 w-12 items-center justify-center rounded-full border shadow-inner",
                        earned
                          ? "bg-black/15 border-white/60"
                          : "bg-slate-900 border-slate-600",
                      ].join(" ")}
                    >
                      <Icon
                        className={[
                          "h-6 w-6",
                          earned ? "text-white" : "text-slate-400",
                        ].join(" ")}
                      />
                    </div>
                    <div className="space-y-1">
                      <div className="text-sm font-semibold">
                        {badge.label}
                      </div>
                      <p className="text-[11px] leading-snug">
                        {badge.description}
                      </p>
                      <p className="text-[10px] text-slate-100/80">
                        Unlock at{" "}
                        <span className="font-semibold">
                          {badge.threshold} donation
                          {badge.threshold > 1 ? "s" : ""}
                        </span>
                      </p>
                    </div>
                    {!earned && (
                      <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] rounded-2xl flex items-center justify-center text-[10px] text-slate-200 font-medium">
                        Locked
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Donation trend / quick glance */}
          <Card className="p-4 bg-slate-900/95 border-slate-700 text-white shadow-xl">
            <div className="mb-3">
              <h2 className="text-sm font-semibold">Donation trend</h2>
              <p className="text-[11px] text-slate-300">
                Month-wise count of your recent donations.
              </p>
            </div>
            {stats.length === 0 ? (
              <p className="text-xs text-slate-400">
                No donation statistics yet. Once donations are recorded, your
                activity will appear here.
              </p>
            ) : (
              <div className="space-y-2">
                {stats.map((s) => (
                  <div
                    key={s.label}
                    className="flex items-center gap-2 text-xs"
                  >
                    <div className="w-16 text-slate-300">{s.label}</div>
                    <div className="flex-1 bg-slate-800 rounded-full h-2 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-red-500 to-blue-500"
                        style={{
                          width: `${(s.count / maxCount) * 100}%`,
                        }}
                      />
                    </div>
                    <div className="w-6 text-right text-slate-100">
                      {s.count}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </section>

        {/* Notifications preview */}
        <section>
          <Card className="p-4 bg-slate-900/95 border-slate-700 text-white shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-sm font-semibold">
                  Matching recipient requests
                </h2>
                <p className="text-[11px] text-slate-300">
                  Requests where your blood type is compatible. Later we’ll
                  connect this to a full notification center.
                </p>
              </div>
              <span className="text-[11px] text-slate-400">
                Showing up to 5 latest
              </span>
            </div>

            {matchingRequests.length === 0 ? (
              <p className="text-xs text-slate-400">
                {loading
                  ? "Checking for matching requests..."
                  : "No active matching requests right now."}
              </p>
            ) : (
              <div className="space-y-2 text-xs">
                {matchingRequests.slice(0, 5).map((r) => (
                  <div
                    key={r._id}
                    className="flex items-start justify-between gap-3 rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2"
                  >
                    <div className="space-y-0.5">
                      <div className="font-medium">
                        {r.bloodType} • {r.units} unit
                        {r.units > 1 ? "s" : ""}
                      </div>
                      <div className="text-[11px] text-slate-300">
                        {r.locationName}
                        {r.locationCity ? ` • ${r.locationCity}` : ""} — for{" "}
                        {r.recipientName || "recipient"}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Requested on {formatDate(r.createdAt)}
                      </div>
                    </div>
                    <div
                      className={[
                        "self-center rounded-full border px-2 py-0.5 text-[10px] font-semibold",
                        urgencyPillClasses(r.urgency),
                      ].join(" ")}
                    >
                      {formatUrgency(r.urgency)} urgency
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </section>
      </div>
    </div>
  );
}
