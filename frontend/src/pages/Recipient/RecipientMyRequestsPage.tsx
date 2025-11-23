// frontend/src/pages/Recipient/RecipientMyRequestsPage.tsx
import { useEffect, useState } from "react";
import { RecipientSidebar } from "@/components/layout/RecipientSidebar";
import api from "@/api/axiosClient";
import { toast } from "sonner";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";

import {
  Table,
  TableHeader,
  TableHead,
  TableRow,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";

type RequestStatus =
  | "PENDING"
  | "APPROVED"
  | "FULFILLED"
  | "REJECTED"
  | "CANCELLED";

type HistoryResponse = {
  summary?: any;
  requests?: any[];
};

const formatDate = (dateStr?: string) => {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const statusClasses: Record<string, string> = {
  PENDING: "bg-amber-500/10 text-amber-300 border-amber-400/40",
  APPROVED: "bg-sky-500/10 text-sky-300 border-sky-400/40",
  FULFILLED: "bg-emerald-500/10 text-emerald-300 border-emerald-400/40",
  REJECTED: "bg-rose-500/10 text-rose-300 border-rose-400/40",
  CANCELLED: "bg-slate-500/10 text-slate-300 border-slate-400/40",
};

const prettyStatus = (s: RequestStatus) => {
  switch (s) {
    case "PENDING":
      return "Pending review";
    case "APPROVED":
      return "Approved";
    case "FULFILLED":
      return "Fulfilled";
    case "REJECTED":
      return "Rejected";
    case "CANCELLED":
      return "Cancelled";
    default:
      return s;
  }
};

export function RecipientMyRequestsPage() {
  const [data, setData] = useState<HistoryResponse | null>(null);
  const [loading, setLoading] = useState(true);

  // search + filters
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | RequestStatus>("ALL");
  const [urgencyFilter, setUrgencyFilter] = useState<
    "ALL" | "LOW" | "MEDIUM" | "HIGH"
  >("ALL");

  // cancel state
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await api.get("/recipient/requests/history");
        setData(res.data);
      } catch (err: any) {
        console.error("Failed to load recipient requests history", err);
        toast.error("Failed to load your requests history.");
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, []);

  const summary = data?.summary || {};
  const requests = data?.requests || [];
  const trendData =
    summary.trend && Array.isArray(summary.trend) ? summary.trend : [];

  // ----- FILTERED LIST -----
  const normalizedSearch = searchTerm.toLowerCase().trim();

  const filteredRequests = requests.filter((req: any) => {
    // status filter
    if (statusFilter !== "ALL" && req.status !== statusFilter) {
      return false;
    }

    // urgency filter
    if (urgencyFilter !== "ALL" && req.urgency !== urgencyFilter) {
      return false;
    }

    // text search filter
    if (!normalizedSearch) return true;

    const haystack = [
      req.bloodType,
      req.locationName,
      req.urgency,
      prettyStatus(req.status as RequestStatus),
    ]
      .join(" ")
      .toLowerCase();

    return haystack.includes(normalizedSearch);
  });

  const handleCancelRow = async (id: string) => {
    try {
      setCancellingId(id);
      const res = await api.patch(`/recipient/requests/${id}/cancel`);
      toast.success("Request cancelled.");

      const updatedRequest = res.data.request;

      // Update local state (requests + summary counters)
      setData((prev) => {
        if (!prev) return prev;

        const updatedRequests = (prev.requests || []).map((r: any) =>
          r._id === id ? { ...r, status: updatedRequest.status } : r
        );

        const pendingCount = updatedRequests.filter(
          (r: any) => r.status === "PENDING"
        ).length;
        const fulfilledCount = updatedRequests.filter(
          (r: any) => r.status === "FULFILLED"
        ).length;

        return {
          ...prev,
          summary: {
            ...(prev.summary || {}),
            pending: pendingCount,
            fulfilled: fulfilledCount,
          },
          requests: updatedRequests,
        };
      });
    } catch (err: any) {
      console.error("Failed to cancel request", err);
      toast.error(
        err?.response?.data?.message ||
          "Unable to cancel this request. It may already be processed."
      );
    } finally {
      setCancellingId(null);
    }
  };

  return (
    <div className="flex gap-6">
      <RecipientSidebar active="requests" />

      <div className="flex-1 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-white">
              My Blood Requests
            </h1>
            <p className="text-sm text-slate-300">
              View the history and status of your blood requests.
            </p>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
            <div className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
              Total requests
            </div>
            <div className="mt-2 text-2xl font-semibold text-white">
              {summary.totalRequests ?? 0}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
            <div className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
              Fulfilled
            </div>
            <div className="mt-2 text-2xl font-semibold text-emerald-300">
              {summary.fulfilled ?? 0}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
            <div className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
              Pending
            </div>
            <div className="mt-2 text-2xl font-semibold text-amber-300">
              {summary.pending ?? 0}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
            <div className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
              Total units requested
            </div>
            <div className="mt-2 text-2xl font-semibold text-sky-300">
              {summary.totalUnitsRequested ?? 0}
            </div>
          </div>
        </div>

        {/* Trend + last received */}
        <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
            <div className="mb-4 flex items-center justify-between gap-2">
              <div>
                <div className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                  Request trend
                </div>
                <div className="text-sm text-slate-300">
                  Units requested over time
                </div>
              </div>
            </div>

            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis
                    dataKey="date"
                    stroke="#64748b"
                    fontSize={12}
                    tickMargin={8}
                  />
                  <YAxis
                    stroke="#64748b"
                    fontSize={12}
                    tickMargin={8}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#020617",
                      borderColor: "#1e293b",
                      borderRadius: 12,
                      fontSize: 12,
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="totalUnits"
                    stroke="#38bdf8"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Last received info */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
            <div className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
              Last fulfilled request
            </div>
            {summary.lastReceived ? (
              <div className="mt-3 space-y-2 text-sm text-slate-200">
                <div>
                  <span className="text-slate-400">Date: </span>
                  <span className="font-medium">
                    {formatDate(
                      summary.lastReceived.fulfilledAt ||
                        summary.lastReceived.updatedAt
                    )}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400">Blood type / units: </span>
                  <span className="font-medium">
                    {summary.lastReceived.bloodType} ·{" "}
                    {summary.lastReceived.units} units
                  </span>
                </div>
                <div>
                  <span className="text-slate-400">Location: </span>
                  <span className="font-medium">
                    {summary.lastReceived.locationName}
                  </span>
                </div>
              </div>
            ) : (
              <div className="mt-3 text-sm text-slate-400">
                No fulfilled requests recorded yet.
              </div>
            )}
          </div>
        </div>

        {/* History table + search / filters */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                Request history
              </div>
              <div className="text-sm text-slate-300">
                Search and filter your previous blood requests
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              {/* Search input */}
              <Input
                placeholder="Search by location, type, status…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-9 w-full min-w-[220px] bg-slate-950/60 text-sm text-slate-100 placeholder:text-slate-500 border-slate-700"
              />

              {/* Status filter */}
              <select
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(e.target.value as "ALL" | RequestStatus)
                }
                className="h-9 rounded-lg border border-slate-700 bg-slate-950/60 px-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500/60"
              >
                <option value="ALL">All statuses</option>
                <option value="PENDING">Pending</option>
                <option value="APPROVED">Approved</option>
                <option value="FULFILLED">Fulfilled</option>
                <option value="REJECTED">Rejected</option>
                <option value="CANCELLED">Cancelled</option>
              </select>

              {/* Urgency filter */}
              <select
                value={urgencyFilter}
                onChange={(e) =>
                  setUrgencyFilter(
                    e.target.value as "ALL" | "LOW" | "MEDIUM" | "HIGH"
                  )
                }
                className="h-9 rounded-lg border border-slate-700 bg-slate-950/60 px-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500/60"
              >
                <option value="ALL">All urgency levels</option>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="py-10 text-center text-sm text-slate-400">
              Loading history…
            </div>
          ) : requests.length === 0 ? (
            <div className="py-10 text-center text-sm text-slate-400">
              You haven&apos;t submitted any requests yet.
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="py-10 text-center text-sm text-slate-400">
              No requests match the current search / filters.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-800">
                    <TableHead className="text-slate-300">Date</TableHead>
                    <TableHead className="text-slate-300">
                      Blood type / units
                    </TableHead>
                    <TableHead className="text-slate-300">Location</TableHead>
                    <TableHead className="text-slate-300">Urgency</TableHead>
                    <TableHead className="text-slate-300">Status</TableHead>
                    <TableHead className="text-slate-300">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRequests.map((req: any) => (
                    <TableRow key={req._id} className="border-slate-800">
                      <TableCell className="text-slate-200">
                        {formatDate(req.createdAt)}
                      </TableCell>
                      <TableCell className="text-slate-200">
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {req.bloodType} · {req.units} units
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-200">
                        {req.locationName || "—"}
                      </TableCell>
                      <TableCell className="text-slate-200">
                        {req.urgency || "—"}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-medium ${
                            statusClasses[req.status as RequestStatus] ||
                            "bg-slate-500/10 text-slate-300 border-slate-400/40"
                          }`}
                        >
                          {prettyStatus(req.status as RequestStatus)}
                        </span>
                      </TableCell>
                      <TableCell>
                        {["PENDING", "APPROVED"].includes(req.status) ? (
                          <button
                            type="button"
                            onClick={() => handleCancelRow(req._id)}
                            disabled={cancellingId === req._id}
                            className="rounded-full border border-rose-500/70 bg-rose-500/10 px-3 py-1 text-[11px] font-medium text-rose-200 hover:bg-rose-500/20 disabled:opacity-60"
                          >
                            {cancellingId === req._id
                              ? "Cancelling…"
                              : "Cancel"}
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-500">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
