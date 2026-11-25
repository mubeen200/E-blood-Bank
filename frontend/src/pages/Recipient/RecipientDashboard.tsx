import { useEffect, useState } from "react";
import { RecipientSidebar } from "@/components/layout/RecipientSidebar";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/context/AuthContext";
import api from "@/api/axiosClient";
import { toast } from "sonner";

type RequestStatus = "PENDING" | "APPROVED" | "FULFILLED" | "REJECTED" | "CANCELLED";

type UrgencyBreakdown = {
  HIGH: number;
  MEDIUM: number;
  LOW: number;
};

type TrendPoint = {
  label: string;
  count: number;
};

type RecentRequest = {
  id: string;
  createdAt: string;
  status: RequestStatus;
  bloodType: string;
  units: number;
  urgency: "HIGH" | "MEDIUM" | "LOW";
  locationName: string;
  locationCity?: string;
};

type LastReceived = {
  id: string;
  date: string;
  bloodType: string;
  units: number;
  locationName: string;
  locationCity?: string;
} | null;

type DashboardSummary = {
  totalRequests: number;
  activeRequests: number;
  completedRequests: number;
  lastReceived: LastReceived;
  urgencyBreakdown: UrgencyBreakdown;
  trend: TrendPoint[];
  recent: RecentRequest[];
};

const EMPTY_SUMMARY: DashboardSummary = {
  totalRequests: 0,
  activeRequests: 0,
  completedRequests: 0,
  lastReceived: null,
  urgencyBreakdown: { HIGH: 0, MEDIUM: 0, LOW: 0 },
  trend: [],
  recent: [],
};

function formatDate(dateStr?: string) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function RecipientDashboard() {
  const { user } = useAuth();
  const [summary, setSummary] = useState<DashboardSummary>(EMPTY_SUMMARY);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        setLoading(true);
        const res = await api.get("/recipient/dashboard");
        const s: DashboardSummary | undefined = res.data?.summary;
        setSummary(s ?? EMPTY_SUMMARY);
      } catch (err) {
        console.error("Failed to load recipient dashboard", err);
        toast.error("Failed to load recipient dashboard.");
        setSummary(EMPTY_SUMMARY);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, []);

  const urgencyTotal =
    summary.urgencyBreakdown.HIGH +
    summary.urgencyBreakdown.MEDIUM +
    summary.urgencyBreakdown.LOW;

  const pct = (value: number) =>
    urgencyTotal > 0 ? Math.round((value / urgencyTotal) * 100) : 0;

  const highPct = pct(summary.urgencyBreakdown.HIGH);
  const medPct = pct(summary.urgencyBreakdown.MEDIUM);
  const lowPct = pct(summary.urgencyBreakdown.LOW);

  return (
    <div className="flex gap-6">
      {/* Sidebar */}
      <RecipientSidebar active="dashboard" />

      {/* Main content */}
      <div className="flex-1 space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
            Welcome back, {user?.name || "Recipient"}
          </h1>
          <p className="text-sm text-slate-300">
            Track your blood requests, monitor urgent needs, and stay informed
            about availability across locations.
          </p>
        </div>

        {/* Top summary cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="bg-slate-900/90 border-slate-800 text-white p-4 space-y-1.5">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Active Requests
            </p>
            <p className="text-3xl font-semibold">
              {loading ? "…" : summary.activeRequests}
            </p>
            <p className="text-xs text-slate-400">
              Requests that are still pending approval or dispatch.
            </p>
          </Card>

          <Card className="bg-slate-900/90 border-slate-800 text-white p-4 space-y-1.5">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Total Requests
            </p>
            <p className="text-3xl font-semibold">
              {loading ? "…" : summary.totalRequests}
            </p>
            <p className="text-xs text-slate-400">
              All requests ever submitted under your account.
            </p>
          </Card>

          <Card className="bg-slate-900/90 border-slate-800 text-white p-4 space-y-1.5">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Completed &amp; Received
            </p>
            <p className="text-3xl font-semibold">
              {loading ? "…" : summary.completedRequests}
            </p>
            <p className="text-xs text-slate-400">
              Requests where units were successfully provided.
            </p>
          </Card>
        </div>

        {/* Middle row: last received + urgency breakdown */}
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
          {/* Last received */}
          <Card className="bg-slate-900/90 border-slate-800 text-white p-4 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Last Received Blood
            </p>
            {summary.lastReceived ? (
              <div className="space-y-1">
                <p className="text-sm">
                  <span className="font-medium">
                    {summary.lastReceived.bloodType}
                  </span>{" "}
                  · {summary.lastReceived.units} unit
                  {summary.lastReceived.units > 1 ? "s" : ""} at{" "}
                  <span className="font-medium">
                    {summary.lastReceived.locationName}
                  </span>
                  {summary.lastReceived.locationCity
                    ? `, ${summary.lastReceived.locationCity}`
                    : ""}
                </p>
                <p className="text-xs text-slate-400">
                  Completed on{" "}
                  {formatDate(summary.lastReceived.date)}
                </p>
              </div>
            ) : (
              <p className="text-sm text-slate-300">
                No completed requests yet. Once your first request is fulfilled,
                details will appear here.
              </p>
            )}
          </Card>

          {/* Urgency breakdown */}
          <Card className="bg-slate-900/90 border-slate-800 text-white p-4 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Urgency Breakdown
            </p>
            <p className="text-xs text-slate-400">
              Distribution of your requests by urgency level.
            </p>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span>High urgency</span>
                <span className="text-slate-300">
                  {summary.urgencyBreakdown.HIGH} ({highPct}%)
                </span>
              </div>
              <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-red-500 transition-all"
                  style={{ width: `${highPct}%` }}
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <span>Medium</span>
                <span className="text-slate-300">
                  {summary.urgencyBreakdown.MEDIUM} ({medPct}%)
                </span>
              </div>
              <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-amber-400 transition-all"
                  style={{ width: `${medPct}%` }}
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <span>Low</span>
                <span className="text-slate-300">
                  {summary.urgencyBreakdown.LOW} ({lowPct}%)
                </span>
              </div>
              <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-emerald-400 transition-all"
                  style={{ width: `${lowPct}%` }}
                />
              </div>
            </div>
          </Card>
        </div>

        {/* Bottom row: trend + recent requests */}
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1.1fr)]">
          {/* Trend */}
          <Card className="bg-slate-900/90 border-slate-800 text-white p-4 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Request Trend (Last 6 Months)
            </p>
            {summary.trend.length === 0 ? (
              <p className="text-sm text-slate-300">
                No requests recorded yet.
              </p>
            ) : (
              <div className="flex items-end gap-3 h-32">
                {(() => {
                  const maxCount = Math.max(
                    1,
                    ...summary.trend.map((pt) => pt.count)
                  );
                  return summary.trend.map((t) => {
                    const pctHeight =
                      t.count === 0
                        ? 8
                        : Math.max(15, Math.round((t.count / maxCount) * 100));
                    return (
                      <div key={t.label} className="flex-1 flex flex-col items-center gap-1 h-full">
                        <div className="flex-1 flex items-end w-full">
                          <div
                            className="w-full rounded-t-md bg-blue-500/80"
                            style={{
                              height: `${pctHeight}%`,
                            }}
                          />
                        </div>
                        <span className="text-[10px] text-slate-400">{t.label}</span>
                        <span className="text-[11px] text-slate-200">{t.count}</span>
                      </div>
                    );
                  });
                })()}
              </div>
            )}
          </Card>

          {/* Recent requests */}
          <Card className="bg-slate-900/90 border-slate-800 text-white p-4 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Recent Requests
            </p>
            {summary.recent.length === 0 ? (
              <p className="text-sm text-slate-300">
                You haven’t submitted any requests yet.
              </p>
            ) : (
              <div className="space-y-2 text-xs">
                {summary.recent.map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center justify-between rounded-md bg-slate-950/60 border border-slate-800 px-3 py-2"
                  >
                    <div className="space-y-0.5">
                      <p className="font-medium text-[13px]">
                        {r.bloodType} · {r.units} unit
                        {r.units > 1 ? "s" : ""} · {r.urgency.toLowerCase()}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {r.locationName}
                        {r.locationCity ? `, ${r.locationCity}` : ""} ·{" "}
                        {formatDate(r.createdAt)}
                      </p>
                    </div>
                    <span
                      className={[
                        "text-[11px] px-2 py-0.5 rounded-full capitalize",
                        r.status === "PENDING"
                          ? "bg-amber-500/15 text-amber-300 border border-amber-500/40"
                          : r.status === "APPROVED"
                          ? "bg-blue-500/15 text-blue-300 border border-blue-500/40"
                          : r.status === "FULFILLED"
                          ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/40"
                          : r.status === "CANCELLED"
                          ? "bg-slate-500/15 text-slate-300 border border-slate-500/40"
                          : "bg-red-500/15 text-red-300 border border-red-500/40",
                      ].join(" ")}
                    >
                      {r.status.toLowerCase()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
