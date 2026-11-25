// src/pages/Admin/AdminRecipientsPage.tsx
import { useEffect, useMemo, useState, ChangeEvent } from "react";
import api from "@/api/axiosClient";
import { AdminSidebar } from "@/components/layout/AdminSidebar";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Search,
  Users,
  Droplet,
  Activity,
  AlertTriangle,
} from "lucide-react";

type RequestStatus =
  | "PENDING"
  | "APPROVED"
  | "FULFILLED"
  | "REJECTED"
  | "CANCELLED";

type ActiveRequest = {
  id: string;
  bloodType?: string;
  units?: number;
  urgency?: string;
  status: RequestStatus;
  isEmergency?: boolean;
  locationName: string;
  locationCity?: string;
  createdAt: string;
};

type RecipientSummary = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  gender?: string;
  cnic?: string;
  bloodType?: string;
  totalRequests: number;
  activeRequestsCount: number;
  fulfilledRequests: number;
  activeRequests: ActiveRequest[];
};

type RecipientsResponse = {
  recipients: RecipientSummary[];
  totalCount: number;
};

function formatDateTime(value?: string) {
  if (!value) return "";
  const d = new Date(value);
  return d.toLocaleString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusChipClasses(status: RequestStatus) {
  switch (status) {
    case "PENDING":
      return "bg-amber-500/15 border-amber-400/60 text-amber-100";
    case "APPROVED":
      return "bg-emerald-500/15 border-emerald-400/60 text-emerald-100";
    case "FULFILLED":
      return "bg-blue-500/15 border-blue-400/60 text-blue-100";
    case "REJECTED":
      return "bg-red-500/15 border-red-400/60 text-red-100";
    case "CANCELLED":
    default:
      return "bg-slate-600/20 border-slate-400/60 text-slate-100";
  }
}

export function AdminRecipientsPage() {
  const [recipients, setRecipients] = useState<RecipientSummary[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await api.get<RecipientsResponse>("/admin/recipients");
        setRecipients(res.data.recipients || []);
        setTotalCount(res.data.totalCount ?? (res.data.recipients || []).length);
      } catch (err: any) {
        console.error("Admin recipients load error:", err);
        toast.error(
          err?.response?.data?.message || "Failed to load recipients list."
        );
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
  };

  const filteredRecipients = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return recipients;

    return recipients.filter((r) => {
      return (
        r.name.toLowerCase().includes(q) ||
        r.email?.toLowerCase().includes(q) ||
        r.phone?.toLowerCase().includes(q) ||
        r.cnic?.toLowerCase().includes(q)
      );
    });
  }, [recipients, search]);

  const visibleCount = filteredRecipients.length;

  const totalActiveRequests = useMemo(
    () =>
      recipients.reduce(
        (sum, r) => sum + (r.activeRequestsCount || 0),
        0
      ),
    [recipients]
  );

  const handleUpdateStatus = async (
    requestId: string,
    recipientId: string,
    newStatus: "APPROVED" | "REJECTED" | "FULFILLED"
  ) => {
    try {
      setUpdatingId(requestId);

      // For completion we send action: "COMPLETE"
      const payload =
        newStatus === "FULFILLED"
          ? { action: "COMPLETE" }
          : { status: newStatus };

      const res = await api.patch("/admin/requests/" + requestId + "/status", payload);

      const updated = res.data?.request as {
        id: string;
        recipientId: string;
        status: RequestStatus;
      };

      setRecipients((prev) =>
        prev.map((rec) => {
          if (rec.id !== recipientId && rec.id !== updated.recipientId) {
            return rec;
          }

          const current = { ...rec };
          const list = [...(current.activeRequests || [])];
          const idx = list.findIndex((r) => r.id === requestId);
          if (idx === -1) return current;

          if (newStatus === "REJECTED" || newStatus === "FULFILLED") {
            // Remove from active requests and decrement count
            list.splice(idx, 1);
            current.activeRequests = list;
            current.activeRequestsCount = Math.max(
              0,
              (current.activeRequestsCount || 0) - 1
            );
            if (newStatus === "FULFILLED") {
              current.fulfilledRequests = (current.fulfilledRequests || 0) + 1;
            }
          } else {
            // APPROVED – keep in list, just update status
            list[idx] = { ...list[idx], status: updated.status };
            current.activeRequests = list;
          }

          return current;
        })
      );

      toast.success(
        newStatus === "APPROVED"
          ? "Request approved."
          : newStatus === "REJECTED"
          ? "Request rejected."
          : "Request marked as completed and inventory updated."
      );
    } catch (err: any) {
      console.error("Update request status error:", err);
      toast.error(
        err?.response?.data?.message ||
          "Failed to update request status."
      );
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="flex gap-6">
      <AdminSidebar />

      <div className="flex-1 space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl md:text-3xl font-semibold">
            Manage Recipients
          </h1>
          <p className="text-sm text-slate-300">
            View recipients and manage their blood requests. Approve, reject or
            complete requests once blood has been provided.
          </p>
        </div>

        {/* Search + counters */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="relative w-full md:max-w-md">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              value={search}
              onChange={handleSearchChange}
              placeholder="Search recipients by name, email, phone or CNIC..."
              className="pl-9 bg-slate-900/90 border-slate-700 text-sm text-white placeholder:text-slate-400"
            />
          </div>

          <div className="flex items-center gap-4 text-xs text-slate-300">
            <div className="flex items-center gap-1">
              <Users className="h-4 w-4 text-blue-300" />
              <span>Recipients:</span>
              <span className="font-semibold">{totalCount}</span>
            </div>
            <div className="flex items-center gap-1">
              <Activity className="h-4 w-4 text-amber-300" />
              <span>Active requests:</span>
              <span className="font-semibold">
                {totalActiveRequests}
              </span>
            </div>
          </div>
        </div>

        {/* Recipients list */}
        <Card className="bg-slate-900/90 border-slate-700 text-white p-4 space-y-3">
          <div className="text-xs uppercase tracking-wide text-slate-400">
            Recipients ({visibleCount})
          </div>
          <p className="text-[11px] text-slate-400 mb-2">
            Each card shows recipient details and any active blood requests that
            may need approval or completion.
          </p>

          {loading ? (
            <p className="text-xs text-slate-400">Loading recipients…</p>
          ) : visibleCount === 0 ? (
            <p className="text-xs text-slate-400">
              No recipients match your search.
            </p>
          ) : (
            <div className="space-y-3">
              {filteredRecipients.map((r) => (
                <div
                  key={r.id}
                  className="flex flex-col md:flex-row md:items-stretch gap-4 rounded-2xl border border-slate-700 bg-slate-950/80 px-4 py-3"
                >
                  {/* Left: recipient info */}
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="font-semibold text-sm">{r.name}</div>
                      {r.bloodType && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-500/15 border border-red-400/60 px-2 py-0.5 text-[11px]">
                          <Droplet className="h-3 w-3 text-red-300" />
                          <span>{r.bloodType}</span>
                        </span>
                      )}
                    </div>

                    <div className="text-[11px] text-slate-300 space-x-1">
                      <span>{r.email}</span>
                      {r.phone && (
                        <>
                          {" "}
                          • <span>{r.phone}</span>
                        </>
                      )}
                      {r.gender && (
                        <>
                          {" "}
                          • <span>{r.gender}</span>
                        </>
                      )}
                    </div>

                    <div className="text-[11px] text-slate-300 space-x-1">
                      {r.cnic && <span>CNIC: {r.cnic}</span>}
                      {" • "}
                      <span>
                        Total requests:{" "}
                        <span className="font-semibold">
                          {r.totalRequests}
                        </span>
                      </span>
                      {" • "}
                      <span>
                        Fulfilled:{" "}
                        <span className="font-semibold">
                          {r.fulfilledRequests}
                        </span>
                      </span>
                    </div>
                  </div>

                  {/* Right: active requests */}
                  <div className="w-full md:w-[320px] border-t md:border-t-0 md:border-l border-slate-700 pl-0 md:pl-4 pt-2 md:pt-0 flex flex-col gap-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-[11px] uppercase tracking-wide text-slate-400">
                        Active requests
                      </div>
                      <AlertTriangle className="h-4 w-4 text-amber-300" />
                    </div>

                    {r.activeRequests.length === 0 ? (
                      <p className="text-[11px] text-slate-400">
                        No pending/approved requests for this recipient.
                      </p>
                    ) : (
                      <div className="space-y-2 text-xs">
                        {r.activeRequests.map((req) => (
                          <div
                            key={req.id}
                            className="rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2 space-y-1"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <div className="font-medium">
                                  {req.bloodType || "Unknown"} ·{" "}
                                  {req.units ?? "?"} unit
                                  {req.units && req.units > 1 ? "s" : ""} ·{" "}
                                  {req.urgency || "N/A"}
                                </div>
                                <div className="text-[11px] text-slate-300">
                                  {req.locationName}
                                  {req.locationCity
                                    ? `, ${req.locationCity}`
                                    : ""}{" "}
                                  · {formatDateTime(req.createdAt)}
                                </div>
                                {req.isEmergency && (
                                  <div className="mt-0.5 text-[10px] inline-flex items-center rounded-full bg-red-500/15 border border-red-400/60 px-2 py-0.5 text-red-100">
                                    Emergency request
                                  </div>
                                )}
                              </div>

                              <span
                                className={[
                                  "rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize",
                                  statusChipClasses(req.status),
                                ].join(" ")}
                              >
                                {req.status.toLowerCase()}
                              </span>
                            </div>

                            {/* Actions */}
                            {req.status === "PENDING" && (
                              <div className="flex justify-end gap-2 pt-1">
                                <Button
                                  type="button"
                                  size="sm"
                                  disabled={updatingId === req.id}
                                  onClick={() =>
                                    handleUpdateStatus(
                                      req.id,
                                      r.id,
                                      "APPROVED"
                                    )
                                  }
                                  className="h-7 bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] px-3"
                                >
                                  {updatingId === req.id
                                    ? "Approving…"
                                    : "Approve"}
                                </Button>

                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  disabled={updatingId === req.id}
                                  onClick={() =>
                                    handleUpdateStatus(
                                      req.id,
                                      r.id,
                                      "REJECTED"
                                    )
                                  }
                                  className="h-7 border-red-500/70 text-red-100 hover:bg-red-900/50 bg-red-950/30 text-[11px] px-3"
                                >
                                  {updatingId === req.id
                                    ? "Rejecting…"
                                    : "Reject"}
                                </Button>
                              </div>
                            )}

                            {req.status === "APPROVED" && (
                              <div className="flex justify-end gap-2 pt-1">
                                <Button
                                  type="button"
                                  size="sm"
                                  disabled={updatingId === req.id}
                                  onClick={() =>
                                    handleUpdateStatus(
                                      req.id,
                                      r.id,
                                      "FULFILLED"
                                    )
                                  }
                                  className="h-7 bg-blue-600 hover:bg-blue-500 text-white text-[11px] px-3"
                                >
                                  {updatingId === req.id
                                    ? "Marking…"
                                    : "Mark completed"}
                                </Button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
