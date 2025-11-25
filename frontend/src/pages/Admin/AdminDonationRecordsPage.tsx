// src/pages/Admin/AdminDonationRecordsPage.tsx
import { useEffect, useMemo, useState, ChangeEvent } from "react";
import api from "@/api/axiosClient";
import { AdminSidebar } from "@/components/layout/AdminSidebar";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Search,
  Droplet,
  CalendarDays,
  MapPin,
} from "lucide-react";

type DonationRecord = {
  id: string;
  date: string;
  timeSlot?: string;
  unitsDonated: number;
  donorName: string;
  donorEmail?: string;
  donorPhone?: string;
  donorBloodType?: string;
  locationName: string;
  locationCity?: string;
};

type DonationResponse = {
  donations: DonationRecord[];
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

export function AdminDonationRecordsPage() {
  const [records, setRecords] = useState<DonationRecord[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await api.get<DonationResponse>("/admin/donations");
        setRecords(res.data.donations || []);
        setTotalCount(
          res.data.totalCount ?? (res.data.donations || []).length
        );
      } catch (err: any) {
        console.error("Admin donation records load error:", err);
        toast.error(
          err?.response?.data?.message ||
            "Failed to load donation records."
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

  const filteredRecords = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return records;

    return records.filter((r) => {
      return (
        r.donorName.toLowerCase().includes(q) ||
        r.donorEmail?.toLowerCase().includes(q) ||
        r.donorPhone?.toLowerCase().includes(q) ||
        r.locationName.toLowerCase().includes(q) ||
        r.locationCity?.toLowerCase().includes(q)
      );
    });
  }, [records, search]);

  const visibleCount = filteredRecords.length;

  const totalUnitsAll = useMemo(
    () =>
      records.reduce(
        (sum, r) => sum + (r.unitsDonated || 0),
        0
      ),
    [records]
  );

  const totalUnitsVisible = useMemo(
    () =>
      filteredRecords.reduce(
        (sum, r) => sum + (r.unitsDonated || 0),
        0
      ),
    [filteredRecords]
  );

  return (
    <div className="flex gap-6">
      <AdminSidebar />

      <div className="flex-1 space-y-6">
        {/* Header */}
        <div className="space-y-1">
          <h1 className="text-2xl md:text-3xl font-semibold">
            Donation Records
          </h1>
          <p className="text-sm text-slate-300">
            History of completed blood donations: who donated, when and
            where, and how many units were provided.
          </p>
        </div>

        {/* Search + counters */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="relative w-full md:max-w-md">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              value={search}
              onChange={handleSearchChange}
              placeholder="Search by donor or location..."
              className="pl-9 bg-slate-900/90 border-slate-700 text-sm text-white placeholder:text-slate-400"
            />
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300">
            <div className="flex items-center gap-1">
              <CalendarDays className="h-4 w-4 text-blue-300" />
              <span>Records:</span>
              <span className="font-semibold">{totalCount}</span>
            </div>
            <div className="flex items-center gap-1">
              <Droplet className="h-4 w-4 text-red-300" />
              <span>Units (visible / total):</span>
              <span className="font-semibold">
                {totalUnitsVisible} / {totalUnitsAll}
              </span>
            </div>
          </div>
        </div>

        {/* Records list */}
        <Card className="bg-slate-900/90 border-slate-700 text-white p-4 space-y-3">
          <div className="text-xs uppercase tracking-wide text-slate-400">
            Donation history ({visibleCount})
          </div>
          <p className="text-[11px] text-slate-400 mb-2">
            Each row shows who donated, date & location of the donation,
            and units donated.
          </p>

          {loading ? (
            <p className="text-xs text-slate-400">
              Loading donation records…
            </p>
          ) : visibleCount === 0 ? (
            <p className="text-xs text-slate-400">
              No donation records match your search.
            </p>
          ) : (
            <div className="space-y-2 text-xs">
              {filteredRecords.map((r) => (
                <div
                  key={r.id}
                  className="grid gap-2 md:grid-cols-[minmax(0,2.2fr)_minmax(0,2fr)_minmax(0,0.7fr)] items-center rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2"
                >
                  {/* Donor */}
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">
                        {r.donorName}
                      </span>
                      {r.donorBloodType && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-500/15 border border-red-400/60 px-2 py-0.5 text-[10px]">
                          <Droplet className="h-3 w-3 text-red-300" />
                          <span>{r.donorBloodType}</span>
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-300">
                      {r.donorEmail}
                      {r.donorPhone && ` • ${r.donorPhone}`}
                    </div>
                  </div>

                  {/* Date & location */}
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2 text-[11px] text-slate-300">
                      <CalendarDays className="h-3 w-3 text-blue-300" />
                      <span>
                        {formatDate(r.date)}
                        {r.timeSlot ? ` • ${r.timeSlot}` : ""}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-slate-300">
                      <MapPin className="h-3 w-3 text-pink-300" />
                      <span>
                        {r.locationName}
                        {r.locationCity ? `, ${r.locationCity}` : ""}
                      </span>
                    </div>
                  </div>

                  {/* Units donated */}
                  <div className="flex md:justify-end">
                    <div className="inline-flex flex-col items-start md:items-end">
                      <span className="text-[10px] text-slate-400 uppercase tracking-wide">
                        Units donated
                      </span>
                      <span className="mt-0.5 inline-flex items-center rounded-full bg-emerald-500/15 border border-emerald-400/70 px-3 py-0.5 text-[11px] text-emerald-100 font-semibold">
                        {r.unitsDonated}
                      </span>
                    </div>
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
