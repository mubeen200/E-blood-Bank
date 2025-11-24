// src/pages/Admin/AdminDashboard.tsx
import { useEffect, useState } from "react";
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

type Stats = {
  totalDonors: number;
  totalRecipients: number;
  totalActiveRequests: number;
  totalSuccessfulDonations: number;
  emergencyActiveCount: number;
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
          </Card>

          <Card className="bg-slate-900/90 border-slate-700 text-white p-4 space-y-1">
            <div className="flex items-center justify-between text-xs uppercase tracking-wide text-slate-400">
              <span>Total recipients</span>
              <Users className="h-4 w-4 text-blue-300" />
            </div>
            <div className="text-2xl font-semibold">
              {stats?.totalRecipients ?? (loading ? "…" : 0)}
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
          </Card>

          <Card className="bg-slate-900/90 border-slate-700 text-white p-4 space-y-1">
            <div className="flex items-center justify-between text-xs uppercase tracking-wide text-slate-400">
              <span>Successful donations</span>
              <Droplet className="h-4 w-4 text-green-300" />
            </div>
            <div className="text-2xl font-semibold">
              {stats?.totalSuccessfulDonations ?? (loading ? "…" : 0)}
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
