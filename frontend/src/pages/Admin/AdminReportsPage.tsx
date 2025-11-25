// src/pages/Admin/AdminReportsPage.tsx
import { useEffect, useMemo, useState } from "react";
import api from "@/api/axiosClient";
import { AdminSidebar } from "@/components/layout/AdminSidebar";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import {
  BarChart3,
  Droplet,
  Activity,
  CalendarDays,
} from "lucide-react";

type StatusCounts = {
  PENDING: number;
  APPROVED: number;
  FULFILLED: number;
  REJECTED: number;
  CANCELLED: number;
};

type Summary = {
  totalDonations: number;
  totalUnitsDonated: number;
  totalRequests: number;
  fulfilledRequests: number;
  successRate: number;
  statusCounts: StatusCounts;
};

type MonthlyDonation = {
  year: number;
  month: number;
  label: string;
  donations: number;
  units: number;
};

type MonthlyRequest = {
  year: number;
  month: number;
  label: string;
  total: number;
  fulfilled: number;
  emergency: number;
};

type BloodGroupRow = {
  bloodType: string;
  count: number;
};

type ReportsResponse = {
  summary: Summary;
  monthlyDonations: MonthlyDonation[];
  monthlyRequests: MonthlyRequest[];
  bloodGroupRequests: BloodGroupRow[];
};

function barWidth(value: number, max: number) {
  if (max <= 0) return "0%";
  const pct = (value / max) * 100;
  return `${Math.max(6, Math.min(100, pct))}%`; // keep tiny bars visible
}

export function AdminReportsPage() {
  const [data, setData] = useState<ReportsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await api.get<ReportsResponse>("/admin/reports");
        setData(res.data);
      } catch (err: any) {
        console.error("Admin reports load error:", err);
        toast.error(
          err?.response?.data?.message ||
            "Failed to load reports & analytics."
        );
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const summary = data?.summary;

  const maxDonationUnits = useMemo(
    () =>
      data?.monthlyDonations.reduce(
        (m, row) => Math.max(m, row.units),
        0
      ) ?? 0,
    [data]
  );

  const maxRequests = useMemo(
    () =>
      data?.monthlyRequests.reduce(
        (m, row) => Math.max(m, row.total),
        0
      ) ?? 0,
    [data]
  );

  const maxBloodRequests = useMemo(
    () =>
      data?.bloodGroupRequests.reduce(
        (m, row) => Math.max(m, row.count),
        0
      ) ?? 0,
    [data]
  );

  return (
    <div className="flex gap-6">
      <AdminSidebar />

      <div className="flex-1 space-y-6">
        {/* Header */}
        <div className="space-y-1">
          <h1 className="text-2xl md:text-3xl font-semibold flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-blue-300" />
            Reports &amp; Analytics
          </h1>
          <p className="text-sm text-slate-300">
            High-level trends across donations and blood requests: monthly
            activity, most requested blood groups, and overall success
            rates.
          </p>
        </div>

        {/* Summary cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="bg-slate-900/90 border-slate-700 text-white p-4 space-y-1">
            <div className="flex items-center justify-between text-xs uppercase tracking-wide text-slate-400">
              <span>Total donations</span>
              <Droplet className="h-4 w-4 text-red-300" />
            </div>
            <div className="text-2xl font-semibold">
              {summary?.totalDonations ?? (loading ? "…" : 0)}
            </div>
            <div className="text-[11px] text-slate-400">
              Completed donation appointments.
            </div>
          </Card>

          <Card className="bg-slate-900/90 border-slate-700 text-white p-4 space-y-1">
            <div className="flex items-center justify-between text-xs uppercase tracking-wide text-slate-400">
              <span>Total units donated</span>
              <Droplet className="h-4 w-4 text-emerald-300" />
            </div>
            <div className="text-2xl font-semibold">
              {summary?.totalUnitsDonated ?? (loading ? "…" : 0)}
            </div>
            <div className="text-[11px] text-slate-400">
              Sum of units from completed donations.
            </div>
          </Card>

          <Card className="bg-slate-900/90 border-slate-700 text-white p-4 space-y-1">
            <div className="flex items-center justify-between text-xs uppercase tracking-wide text-slate-400">
              <span>Total requests</span>
              <Activity className="h-4 w-4 text-amber-300" />
            </div>
            <div className="text-2xl font-semibold">
              {summary?.totalRequests ?? (loading ? "…" : 0)}
            </div>
            <div className="text-[11px] text-slate-400">
              All blood requests recorded in the system.
            </div>
          </Card>

          <Card className="bg-slate-900/90 border-slate-700 text-white p-4 space-y-1">
            <div className="flex items-center justify-between text-xs uppercase tracking-wide text-slate-400">
              <span>Success rate</span>
              <BarChart3 className="h-4 w-4 text-blue-300" />
            </div>
            <div className="text-2xl font-semibold">
              {summary
                ? `${summary.successRate}%`
                : loading
                ? "…"
                : "0%"}
            </div>
            <div className="text-[11px] text-slate-400">
              Fulfilled requests / total requests.
            </div>
          </Card>
        </div>

        {/* Middle row: monthly charts */}
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Monthly donations */}
          <Card className="bg-slate-900/90 border-slate-700 text-white p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs uppercase tracking-wide text-slate-400">
                  Monthly donations (last 6 months)
                </div>
                <p className="text-[11px] text-slate-400">
                  Units donated per month from completed appointments.
                </p>
              </div>
              <CalendarDays className="h-5 w-5 text-blue-300" />
            </div>

            {loading ? (
              <p className="text-xs text-slate-400">
                Loading donation data…
              </p>
            ) : (
              <div className="space-y-2 text-xs">
                {data?.monthlyDonations.map((row) => (
                  <div
                    key={`${row.year}-${row.month}`}
                    className="flex items-center gap-3"
                  >
                    <div className="w-10 text-[11px] text-slate-300">
                      {row.label}
                    </div>
                    <div className="flex-1">
                      <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                        <div
                          className="h-2 rounded-full bg-gradient-to-r from-emerald-400 via-blue-400 to-indigo-400"
                          style={{
                            width: barWidth(row.units, maxDonationUnits),
                          }}
                        />
                      </div>
                    </div>
                    <div className="w-20 text-right text-[11px] text-slate-300">
                      {row.units} units
                    </div>
                  </div>
                ))}
                {!data?.monthlyDonations.length && (
                  <p className="text-[11px] text-slate-400">
                    No donations recorded yet.
                  </p>
                )}
              </div>
            )}
          </Card>

          {/* Monthly requests */}
          <Card className="bg-slate-900/90 border-slate-700 text-white p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs uppercase tracking-wide text-slate-400">
                  Monthly requests (last 6 months)
                </div>
                <p className="text-[11px] text-slate-400">
                  Incoming requests and how many were fulfilled.
                </p>
              </div>
              <Activity className="h-5 w-5 text-amber-300" />
            </div>

            {loading ? (
              <p className="text-xs text-slate-400">
                Loading request data…
              </p>
            ) : (
              <div className="space-y-2 text-xs">
                {data?.monthlyRequests.map((row) => (
                  <div
                    key={`${row.year}-${row.month}`}
                    className="space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-slate-300">
                        {row.label}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {row.fulfilled}/{row.total} fulfilled
                        {row.emergency ? ` • ${row.emergency} emergency` : ""}
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className="h-2 bg-gradient-to-r from-blue-400 to-blue-600"
                        style={{
                          width: barWidth(row.total, maxRequests),
                        }}
                      />
                    </div>
                  </div>
                ))}
                {!data?.monthlyRequests.length && (
                  <p className="text-[11px] text-slate-400">
                    No requests recorded yet.
                  </p>
                )}
              </div>
            )}
          </Card>
        </div>

        {/* Bottom row: blood groups + status breakdown */}
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
          {/* Blood group table */}
          <Card className="bg-slate-900/90 border-slate-700 text-white p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs uppercase tracking-wide text-slate-400">
                  Most requested blood groups
                </div>
                <p className="text-[11px] text-slate-400">
                  Ranked by number of requests in the system.
                </p>
              </div>
              <Droplet className="h-5 w-5 text-red-300" />
            </div>

            {loading ? (
              <p className="text-xs text-slate-400">
                Loading blood group stats…
              </p>
            ) : !data?.bloodGroupRequests.length ? (
              <p className="text-xs text-slate-400">
                No requests yet, so no blood group breakdown is
                available.
              </p>
            ) : (
              <div className="space-y-2 text-xs">
                {data.bloodGroupRequests.map((row) => (
                  <div
                    key={row.bloodType}
                    className="flex items-center gap-3"
                  >
                    <div className="w-10 text-[11px] font-semibold">
                      {row.bloodType}
                    </div>
                    <div className="flex-1">
                      <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                        <div
                          className="h-2 rounded-full bg-gradient-to-r from-red-400 via-orange-400 to-yellow-400"
                          style={{
                            width: barWidth(
                              row.count,
                              maxBloodRequests
                            ),
                          }}
                        />
                      </div>
                    </div>
                    <div className="w-12 text-right text-[11px] text-slate-300">
                      {row.count}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Status breakdown mini-table */}
          <Card className="bg-slate-900/90 border-slate-700 text-white p-4 space-y-3">
            <div className="text-xs uppercase tracking-wide text-slate-400">
              Request status breakdown
            </div>
            <p className="text-[11px] text-slate-400">
              How current and past requests are distributed by status.
            </p>

            {summary ? (
              <div className="space-y-1 text-xs">
                {(
                  [
                    "PENDING",
                    "APPROVED",
                    "FULFILLED",
                    "REJECTED",
                    "CANCELLED",
                  ] as (keyof StatusCounts)[]
                ).map((key) => (
                  <div
                    key={key}
                    className="flex items-center justify-between"
                  >
                    <span className="capitalize text-slate-300">
                      {key.toLowerCase()}
                    </span>
                    <span className="font-semibold">
                      {summary.statusCounts[key] ?? 0}
                    </span>
                  </div>
                ))}
              </div>
            ) : loading ? (
              <p className="text-xs text-slate-400">
                Loading status stats…
              </p>
            ) : (
              <p className="text-xs text-slate-400">
                No request data available.
              </p>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
