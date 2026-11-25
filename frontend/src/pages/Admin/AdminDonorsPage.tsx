// src/pages/Admin/AdminDonorsPage.tsx
import { useEffect, useMemo, useState, ChangeEvent } from "react";
import api from "@/api/axiosClient";
import { AdminSidebar } from "@/components/layout/AdminSidebar";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Search,
  Droplet,
  Activity,
  HeartPulse,
} from "lucide-react";

type AppointmentStatus = "SCHEDULED" | "COMPLETED" | "CANCELLED";

type LatestAppointment = {
  id: string;
  date: string;
  timeSlot: string;
  status: AppointmentStatus;
  locationName: string;
  locationCity?: string;
  unitsDonated?: number;
};

type DonorWithStats = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  gender?: string;
  cnic?: string;
  bloodType?: string;
  age?: number | null;
  weight?: number | null;
  healthCondition?: string;
  totalDonations: number;
  latestAppointment?: LatestAppointment | null;
};

type DonorsResponse = {
  donors: DonorWithStats[];
  totalCount: number;
};

function formatDate(dateStr?: string) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function statusChipClasses(status: AppointmentStatus) {
  switch (status) {
    case "SCHEDULED":
      return "bg-blue-500/15 border-blue-400/60 text-blue-100";
    case "COMPLETED":
      return "bg-emerald-500/15 border-emerald-400/60 text-emerald-100";
    case "CANCELLED":
    default:
      return "bg-slate-600/20 border-slate-400/60 text-slate-100";
  }
}

export function AdminDonorsPage() {
  const [donors, setDonors] = useState<DonorWithStats[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [markingId, setMarkingId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await api.get<DonorsResponse>("/admin/donors");
        setDonors(res.data.donors || []);
        setTotalCount(res.data.totalCount ?? (res.data.donors || []).length);
      } catch (err: any) {
        console.error("Admin donors load error:", err);
        toast.error(
          err?.response?.data?.message ||
            "Failed to load donors list."
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

  const filteredDonors = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return donors;

    return donors.filter((d) => {
      return (
        d.name.toLowerCase().includes(q) ||
        d.email?.toLowerCase().includes(q) ||
        d.phone?.toLowerCase().includes(q) ||
        d.cnic?.toLowerCase().includes(q)
      );
    });
  }, [donors, search]);

  const visibleCount = filteredDonors.length;

  const handleMarkCompleted = async (
    appointmentId: string,
    donorId: string
  ) => {
    try {
      setMarkingId(appointmentId);
      const res = await api.patch("/admin/donor-appointments/" + appointmentId + "/complete");
      const updated = res.data?.appointment as {
        id: string;
        donorId: string;
        status: AppointmentStatus;
        date: string;
        timeSlot: string;
        locationName: string;
        locationCity?: string;
        unitsDonated?: number;
      };

      setDonors((prev) =>
        prev.map((d) => {
          if (d.id !== donorId && d.id !== updated.donorId) return d;

          const newTotal = (d.totalDonations || 0) + 1;

          return {
            ...d,
            totalDonations: newTotal,
            latestAppointment: {
              id: updated.id,
              status: updated.status,
              date: updated.date,
              timeSlot: updated.timeSlot,
              locationName: updated.locationName,
              locationCity: updated.locationCity,
              unitsDonated: updated.unitsDonated,
            },
          };
        })
      );

      toast.success("Appointment marked as completed.");
    } catch (err: any) {
      console.error("Mark completed error:", err);
      toast.error(
        err?.response?.data?.message ||
          "Failed to mark appointment as completed."
      );
    } finally {
      setMarkingId(null);
    }
  };

  return (
    <div className="flex gap-6">
      <AdminSidebar />

      <div className="flex-1 space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl md:text-3xl font-semibold">
            Manage Donors
          </h1>
          <p className="text-sm text-slate-300">
            View registered donors, their health info, and latest donation
            appointments. Mark attended appointments as completed.
          </p>
        </div>

        {/* Search + counters */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="relative w-full md:max-w-md">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              value={search}
              onChange={handleSearchChange}
              placeholder="Search donors by name, email, phone or CNIC..."
              className="pl-9 bg-slate-900/90 border-slate-700 text-sm text-white placeholder:text-slate-400"
            />
          </div>

          <div className="flex items-center gap-4 text-xs text-slate-300">
            <div className="flex items-center gap-1">
              <HeartPulse className="h-4 w-4 text-pink-300" />
              <span>Donors:</span>
              <span className="font-semibold">{totalCount}</span>
            </div>
            <div className="flex items-center gap-1">
              <Droplet className="h-4 w-4 text-red-300" />
              <span>Visible:</span>
              <span className="font-semibold">{visibleCount}</span>
            </div>
          </div>
        </div>

        {/* Donor list */}
        <Card className="bg-slate-900/90 border-slate-700 text-white p-4 space-y-3">
          <div className="text-xs uppercase tracking-wide text-slate-400">
            Donors ({visibleCount})
          </div>
          <p className="text-[11px] text-slate-400 mb-2">
            Each card shows basic details, latest appointment and health /
            eligibility notes.
          </p>

          {loading ? (
            <p className="text-xs text-slate-400">Loading donors…</p>
          ) : visibleCount === 0 ? (
            <p className="text-xs text-slate-400">
              No donors match your search.
            </p>
          ) : (
            <div className="space-y-3">
              {filteredDonors.map((d) => {
                const appt = d.latestAppointment || undefined;
                const hasAppt = !!appt;

                return (
                  <div
                    key={d.id}
                    className="flex flex-col md:flex-row md:items-stretch gap-4 rounded-2xl border border-slate-700 bg-slate-950/80 px-4 py-3"
                  >
                    {/* Left: donor info */}
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <div className="font-semibold text-sm">
                          {d.name}
                        </div>
                        {d.bloodType && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-red-500/15 border border-red-400/60 px-2 py-0.5 text-[11px]">
                            <Droplet className="h-3 w-3 text-red-300" />
                            <span>{d.bloodType}</span>
                          </span>
                        )}
                      </div>

                      <div className="text-[11px] text-slate-300 space-x-1">
                        <span>{d.email}</span>
                        {d.phone && <>• <span>{d.phone}</span></>}
                        {d.gender && <> • <span>{d.gender}</span></>}
                      </div>

                      <div className="text-[11px] text-slate-300 space-x-1">
                        {d.age !== null && d.age !== undefined && (
                          <>
                            <span>Age: {d.age}</span>
                            {" • "}
                          </>
                        )}
                        {d.weight !== null && d.weight !== undefined && (
                          <>
                            <span>Weight: {d.weight} kg</span>
                            {" • "}
                          </>
                        )}
                        <span>
                          Total donations:{" "}
                          <span className="font-semibold">
                            {d.totalDonations || 0}
                          </span>
                        </span>
                      </div>

                      {d.healthCondition && (
                        <div className="text-[11px] text-slate-400">
                          Health: {d.healthCondition}
                        </div>
                      )}
                    </div>

                    {/* Right: latest appointment */}
                    <div className="w-full md:w-72 border-t md:border-t-0 md:border-l border-slate-700 pl-0 md:pl-4 pt-2 md:pt-0 flex flex-col justify-between gap-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-[11px] uppercase tracking-wide text-slate-400">
                          Latest appointment
                        </div>
                        <Activity className="h-4 w-4 text-slate-300" />
                      </div>

                      {hasAppt ? (
                        <>
                          <div className="text-[11px] text-slate-300">
                            <div className="font-medium">
                              {formatDate(appt!.date)} • {appt!.timeSlot}
                            </div>
                            <div>
                              {appt!.locationName}
                              {appt!.locationCity
                                ? `, ${appt!.locationCity}`
                                : ""}
                            </div>
                            {typeof appt!.unitsDonated === "number" &&
                              appt!.unitsDonated > 0 &&
                              appt!.status === "COMPLETED" && (
                                <div>
                                  Units donated: {appt!.unitsDonated}
                                </div>
                              )}
                          </div>

                          <div className="flex items-center justify-between gap-2 mt-1">
                            <span
                              className={
                                "rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize " +
                                statusChipClasses(appt!.status)
                              }
                            >
                              {appt!.status.toLowerCase()}
                            </span>

                            {appt!.status === "SCHEDULED" && (
                              <Button
                                type="button"
                                size="sm"
                                disabled={markingId === appt!.id}
                                onClick={() =>
                                  handleMarkCompleted(appt!.id, d.id)
                                }
                                className="h-7 bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] px-3"
                              >
                                {markingId === appt!.id
                                  ? "Updating…"
                                  : "Mark completed"}
                              </Button>
                            )}
                          </div>
                        </>
                      ) : (
                        <p className="text-[11px] text-slate-400">
                          No donation appointments yet.
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
