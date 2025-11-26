// src/pages/Admin/AdminDashboard.tsx
import { useEffect, useState, useMemo } from "react";
import api from "@/api/axiosClient";
import { AdminSidebar } from "@/components/layout/AdminSidebar";
import { Card } from "@/components/ui/card";
import {
  Activity,
  AlertTriangle,
  Droplet,
  Users,
  BarChart3,
} from "lucide-react";
import { toast } from "sonner";

type RequestStatusCounts = {
  PENDING: number;
  APPROVED: number;
  FULFILLED: number;
  REJECTED: number;
  CANCELLED: number;
};

type Stats = {
  totalDonors: number;
  totalRecipients: number;
  totalActiveRequests: number;
  totalSuccessfulDonations: number;
  emergencyActiveCount: number;
  totalRequests?: number;
  pendingHighUrgencyCount?: number;
  requestStatusCounts?: RequestStatusCounts;
};

type RecentEmergency = {
  id: string;
  createdAt: string;
  bloodType?: string;
  units?: number;
  urgency?: string;
  status: string;
  recipientName: string;
  locationName: string;
  locationCity?: string;
};

type RecentDonation = {
  id: string;
  createdAt: string;
  bloodType?: string;
  units?: number;
  donorName: string;
  locationName: string;
  locationCity?: string;
  status?: string;
};

type DashboardData = {
  stats: Stats;
  recentEmergencies: RecentEmergency[];
  recentDonations: RecentDonation[];
};

function formatDateTime(value: string | Date | undefined) {
  if (!value) return "";
  const d = typeof value === "string" ? new Date(value) : value;
  return d.toLocaleString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await api.get("/admin/dashboard");
        setData(res.data);
      } catch (err: any) {
        console.error("Admin dashboard load error:", err);
        toast.error(
          err?.response?.data?.message ||
            "Failed to load admin dashboard."
        );
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const stats = data?.stats;

  const statusCounts: RequestStatusCounts = useMemo(
    () =>
      stats?.requestStatusCounts || {
        PENDING: 0,
        APPROVED: 0,
        FULFILLED: 0,
        REJECTED: 0,
        CANCELLED: 0,
      },
    [stats]
  );

  const totalRequests = useMemo(() => {
    if (stats?.totalRequests !== undefined) return stats.totalRequests;

    return (
      statusCounts.PENDING +
      statusCounts.APPROVED +
      statusCounts.FULFILLED +
      statusCounts.REJECTED +
      statusCounts.CANCELLED
    );
  }, [stats, statusCounts]);

  const donorRecipientRatio =
    stats && stats.totalRecipients
      ? (stats.totalDonors / stats.totalRecipients).toFixed(1)
      : null;

  const avgRequestsPerRecipient =
    stats && stats.totalRecipients
      ? (totalRequests / stats.totalRecipients).toFixed(1)
      : null;

  const successRate =
    totalRequests > 0
      ? Math.round((statusCounts.FULFILLED / totalRequests) * 100)
      : 0;

  const pendingHighUrgency = stats?.pendingHighUrgencyCount ?? 0;

  // recent activity counters (from the last few items we have)
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const emergenciesLast24h =
    data?.recentEmergencies.filter(
      (e) => new Date(e.createdAt) >= oneDayAgo
    ).length ?? 0;

  const donationsLast24h =
    data?.recentDonations.filter(
      (d) => new Date(d.createdAt) >= oneDayAgo
    ).length ?? 0;

  const emergenciesLast7d =
    data?.recentEmergencies.filter(
      (e) => new Date(e.createdAt) >= sevenDaysAgo
    ).length ?? 0;

  const donationsLast7d =
    data?.recentDonations.filter(
      (d) => new Date(d.createdAt) >= sevenDaysAgo
    ).length ?? 0;

  const locationsWithEmergencies = useMemo(() => {
    const set = new Set<string>();
    data?.recentEmergencies.forEach((e) => {
      if (e.locationName) set.add(e.locationName);
    });
    return set.size;
  }, [data]);

  const emergencyShareActive =
    stats && stats.totalActiveRequests
      ? Math.round(
          (stats.emergencyActiveCount / stats.totalActiveRequests) * 100
        )
      : 0;

  const statusPercent = (count: number) =>
    totalRequests > 0
      ? Math.round((count / totalRequests) * 100)
      : 0;

  return (
    <div className="flex gap-6">
      <AdminSidebar />

      <div className="flex-1 space-y-6">
        {/* Header */}
        <div className="space-y-1">
          <h1 className="text-2xl md:text-3xl font-semibold">
            Admin Dashboard
          </h1>
          <p className="text-sm text-slate-300">
            Monitor donors, recipients, inventory and urgent requests across
            the whole E-BloodBank system.
          </p>
        </div>

        {/* Top stats row */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <Card className="bg-slate-900/90 border-slate-700 text-white p-4 space-y-1">
            <div className="flex items-center justify-between text-xs uppercase tracking-wide text-slate-400">
              <span>Total donors</span>
              <Users className="h-4 w-4 text-red-300" />
            </div>
            <div className="text-2xl font-semibold">
              {stats?.totalDonors ?? (loading ? "…" : 0)}
            </div>
            <div className="text-[11px] text-slate-400">
              {donorRecipientRatio
                ? `Donor : recipient ratio ≈ ${donorRecipientRatio}:1`
                : "Invite more donors and recipients to get started."}
            </div>
          </Card>

          <Card className="bg-slate-900/90 border-slate-700 text-white p-4 space-y-1">
            <div className="flex items-center justify-between text-xs uppercase tracking-wide text-slate-400">
              <span>Total recipients</span>
              <Users className="h-4 w-4 text-blue-300" />
            </div>
            <div className="text-2xl font-semibold">
              {stats?.totalRecipients ?? (loading ? "…" : 0)}
            </div>
            <div className="text-[11px] text-slate-400">
              {avgRequestsPerRecipient
                ? `Avg. ${avgRequestsPerRecipient} requests per recipient`
                : "No requests submitted yet."}
            </div>
          </Card>

          <Card className="bg-slate-900/90 border-slate-700 text-white p-4 space-y-1">
            <div className="flex items-center justify-between text-xs uppercase tracking-wide text-slate-400">
              <span>Active requests</span>
              <Activity className="h-4 w-4 text-yellow-300" />
            </div>
            <div className="text-2xl font-semibold">
              {stats?.totalActiveRequests ?? (loading ? "…" : 0)}
            </div>
            <div className="text-[11px] text-slate-400">
              {statusCounts.PENDING} pending ·{" "}
              {statusCounts.APPROVED} approved
            </div>
          </Card>

          <Card className="bg-slate-900/90 border-slate-700 text-white p-4 space-y-1">
            <div className="flex items-center justify-between text-xs uppercase tracking-wide text-slate-400">
              <span>Successful donations</span>
              <Droplet className="h-4 w-4 text-green-300" />
            </div>
            <div className="text-2xl font-semibold">
              {stats?.totalSuccessfulDonations ?? (loading ? "…" : 0)}
            </div>
            <div className="text-[11px] text-slate-400">
              {totalRequests
                ? `${successRate}% of ${totalRequests} requests fulfilled`
                : "No fulfilled requests yet."}
            </div>
          </Card>

          <Card className="bg-slate-900/90 border-slate-700 text-white p-4 space-y-1">
            <div className="flex items-center justify-between text-xs uppercase tracking-wide text-slate-400">
              <span>Emergency active</span>
              <AlertTriangle className="h-4 w-4 text-red-400" />
            </div>
            <div className="text-2xl font-semibold">
              {stats?.emergencyActiveCount ?? (loading ? "…" : 0)}
            </div>
            <div className="text-[11px] text-slate-400">
              {pendingHighUrgency
                ? `${pendingHighUrgency} high-urgency pending`
                : "No high-urgency queue right now."}
            </div>
          </Card>
        </div>

        {/* Mid-row insight cards */}
        <div className="grid gap-4 lg:grid-cols-3">
          {/* Requests overview */}
          <Card className="bg-slate-900/90 border-slate-700 text-white p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs uppercase tracking-wide text-slate-400">
                  Requests overview
                </div>
                <p className="text-[11px] text-slate-400">
                  All blood requests in the system, by status.
                </p>
              </div>
              <Activity className="h-4 w-4 text-slate-300" />
            </div>

            <div className="space-y-2 text-xs">
              {(
                [
                  "PENDING",
                  "APPROVED",
                  "FULFILLED",
                  "REJECTED",
                  "CANCELLED",
                ] as (keyof RequestStatusCounts)[]
              ).map((key) => {
                const count = statusCounts[key] || 0;
                const pct = statusPercent(count);
                const label = key.toLowerCase();

                let barColor =
                  "bg-slate-500"; // default
                if (key === "PENDING") barColor = "bg-amber-400";
                if (key === "APPROVED") barColor = "bg-blue-400";
                if (key === "FULFILLED") barColor = "bg-emerald-400";
                if (key === "REJECTED") barColor = "bg-red-400";

                return (
                  <div
                    key={key}
                    className="flex items-center gap-2"
                  >
                    <span className="w-20 capitalize text-slate-300">
                      {label}
                    </span>
                    <div className="flex-1 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${barColor}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="w-10 text-right">
                      {count}
                    </span>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Recent activity (24h / 7d) */}
          <Card className="bg-slate-900/90 border-slate-700 text-white p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs uppercase tracking-wide text-slate-400">
                  Recent activity
                </div>
                <p className="text-[11px] text-slate-400">
                  Snapshot of emergencies and completed donations.
                </p>
              </div>
              <BarChart3 className="h-4 w-4 text-blue-300" />
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-300">
                  Last 24 hours
                </span>
                <span className="text-slate-200">
                  {emergenciesLast24h} emergencies ·{" "}
                  {donationsLast24h} donations
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-300">
                  Last 7 days (from latest data)
                </span>
                <span className="text-slate-200">
                  {emergenciesLast7d} emergencies ·{" "}
                  {donationsLast7d} donations
                </span>
              </div>
              <p className="text-[10px] text-slate-500">
                * Based on most recent records stored for this
                dashboard.
              </p>
            </div>
          </Card>

          {/* System snapshot */}
          <Card className="bg-slate-900/90 border-slate-700 text-white p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs uppercase tracking-wide text-slate-400">
                  System snapshot
                </div>
                <p className="text-[11px] text-slate-400">
                  Quick ratios across donors, recipients and emergencies.
                </p>
              </div>
              <Activity className="h-4 w-4 text-emerald-300" />
            </div>

            <div className="space-y-1 text-xs text-slate-200">
              <div className="flex items-center justify-between">
                <span>Registered users</span>
                <span className="font-semibold">
                  {(stats?.totalDonors || 0) +
                    (stats?.totalRecipients || 0)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Avg. requests / recipient</span>
                <span className="font-semibold">
                  {avgRequestsPerRecipient ?? "0.0"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Emergency share of active</span>
                <span className="font-semibold">
                  {stats?.totalActiveRequests
                    ? `${emergencyShareActive}%`
                    : "0%"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Locations with emergencies</span>
                <span className="font-semibold">
                  {locationsWithEmergencies}
                </span>
              </div>
            </div>
          </Card>
        </div>

        {/* Bottom grid: emergencies + donations */}
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="bg-slate-900/90 border-slate-700 text-white p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs uppercase tracking-wide text-slate-400">
                  Recent emergency requests
                </div>
                <p className="text-[11px] text-slate-400">
                  Highest priority cases across all locations.
                </p>
              </div>
              <AlertTriangle className="h-5 w-5 text-red-400" />
            </div>

            <div className="space-y-2 text-sm">
              {data?.recentEmergencies?.length ? (
                data.recentEmergencies.map((r) => (
                  <div
                    key={r.id}
                    className="flex flex-col rounded-lg bg-slate-950/80 border border-slate-700 px-3 py-2"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-1">
                      <div className="font-medium">
                        {r.bloodType || "Unknown"} · {r.units ?? "?"} unit
                        {r.units && r.units > 1 ? "s" : ""}
                      </div>
                      <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-[11px] uppercase tracking-wide text-red-200">
                        {r.urgency?.toLowerCase() || "emergency"}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      {r.recipientName} · {r.locationName}
                      {r.locationCity ? `, ${r.locationCity}` : ""} ·{" "}
                      {formatDateTime(r.createdAt)}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400">
                  No emergency requests recorded yet.
                </p>
              )}
            </div>
          </Card>

          <Card className="bg-slate-900/90 border-slate-700 text-white p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs uppercase tracking-wide text-slate-400">
                  Recent donations
                </div>
                <p className="text-[11px] text-slate-400">
                  Last completed donations by donors and locations.
                </p>
              </div>
              <BarChart3 className="h-5 w-5 text-blue-300" />
            </div>

            <div className="space-y-2 text-sm">
              {data?.recentDonations?.length ? (
                data.recentDonations.map((d) => (
                  <div
                    key={d.id}
                    className="flex flex-col rounded-lg bg-slate-950/80 border border-slate-700 px-3 py-2"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-1">
                      <div className="font-medium">
                        {d.bloodType || "Unknown"} · {d.units ?? "?"} unit
                        {d.units && d.units > 1 ? "s" : ""}
                      </div>
                      {d.status && (
                        <span className="rounded-full bg-green-500/15 px-2 py-0.5 text-[11px] uppercase tracking-wide text-green-200">
                          {d.status.toLowerCase()}
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      {d.donorName} · {d.locationName}
                      {d.locationCity ? `, ${d.locationCity}` : ""} ·{" "}
                      {formatDateTime(d.createdAt)}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400">
                  No donation records available yet.
                </p>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
