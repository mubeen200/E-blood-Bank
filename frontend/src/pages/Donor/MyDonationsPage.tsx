import { useEffect, useMemo, useState, ChangeEvent } from "react";
import api from "@/api/axiosClient";
import { DonorSidebar } from "@/components/layout/DonorSidebar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { History, Search, Droplet, CalendarDays, MapPin } from "lucide-react";

type DonationStatus = "COMPLETED" | "CANCELLED" | "ALL";

type Donation = {
  _id: string;
  date: string;
  timeSlot: string;
  status: "COMPLETED" | "CANCELLED" | "SCHEDULED";
  unitsDonated?: number | null;
  location: {
    _id: string;
    name: string;
    city?: string;
  } | null;
};

type OverviewStats = {
  stats: {
    totalDonations: number;
    upcomingAppointments: number;
  };
};

export function MyDonationsPage() {
  const [donations, setDonations] = useState<Donation[]>([]);
  const [overview, setOverview] = useState<OverviewStats | null>(null);

  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<DonationStatus>("COMPLETED");
  const [search, setSearch] = useState("");

  const [error, setError] = useState<string | null>(null);

  const formatDate = (value: string) =>
    new Date(value).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

  const formatTime = (value: string) => value;

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);

        const statusQuery =
          statusFilter === "ALL" ? "ALL" : statusFilter.toString();

        const [donRes, ovRes] = await Promise.all([
          api.get(`/donor/donations?status=${statusQuery}`),
          api.get("/donor/overview"),
        ]);

        setDonations(donRes.data.donations || []);
        setOverview(ovRes.data);
      } catch (err: any) {
        console.error("MyDonations load error:", err);
        const msg =
          err?.response?.data?.message ||
          err?.message ||
          "Failed to load donation history.";
        setError(msg);
        toast.error(msg);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [statusFilter]);

  const filteredDonations = useMemo(() => {
    const term = search.toLowerCase().trim();
    if (!term) return donations;

    return donations.filter((d) => {
      const dateStr = formatDate(d.date).toLowerCase();
      const locName = d.location?.name?.toLowerCase() || "";
      const city = d.location?.city?.toLowerCase() || "";
      const status = d.status.toLowerCase();

      return (
        dateStr.includes(term) ||
        locName.includes(term) ||
        city.includes(term) ||
        status.includes(term)
      );
    });
  }, [donations, search]);

  const totalDonations = overview?.stats.totalDonations ?? donations.length;
   // only consider COMPLETED donations for "last donation"
  const lastDonation = useMemo(
    () => donations.find((d) => d.status === "COMPLETED") || null,
    [donations]
  );

  const livesSaved = totalDonations * 3;

  // Simple monthly chart data (last 6 months)
    const monthlyData = useMemo(() => {
    const map = new Map<string, number>();

    // only completed donations should appear in the monthly chart
    const completed = donations.filter((d) => d.status === "COMPLETED");

    completed.forEach((d) => {
      const dt = new Date(d.date);
      const key = `${dt.getFullYear()}-${dt.getMonth() + 1}`;
      map.set(key, (map.get(key) || 0) + 1);
    });

    const entries = Array.from(map.entries())
      .sort((a, b) => (a[0] < b[0] ? -1 : 1))
      .slice(-6);

    return entries.map(([key, count]) => {
      const [yearStr, monthStr] = key.split("-");
      const year = Number(yearStr);
      const month = Number(monthStr);
      const label = new Date(year, month - 1, 1).toLocaleDateString(
        undefined,
        { month: "short" }
      );
      return { label, count };
    });
  }, [donations]);


  const maxMonthly = monthlyData.reduce(
    (max, d) => (d.count > max ? d.count : max),
    1
  );

  const handleStatusChange = (value: DonationStatus) => {
    setStatusFilter(value);
  };

  const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
  };

  const statusChipClass = (value: DonationStatus) =>
    [
      "px-3 py-1 rounded-full text-xs font-semibold border transition-all",
      statusFilter === value
        ? "bg-red-600 text-white border-red-400 shadow-sm"
        : "bg-slate-900 text-slate-200 border-slate-600 hover:bg-slate-800",
    ].join(" ");

  return (
    <div className="flex gap-6">
      <DonorSidebar />

      <div className="flex-1 space-y-6">
        {/* Header */}
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <History className="h-6 w-6 text-red-400" />
            My Donations
          </h1>
          <p className="text-sm text-slate-300">
            Review your past donations, see where you donated, and track your
            overall impact.
          </p>
        </div>

        {/* Top stats + tiny chart */}
        <section className="grid gap-4 md:grid-cols-3">
          <Card className="p-4 bg-slate-900/90 border-slate-700 text-white flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[11px] uppercase text-slate-400">
                  Total donations
                </div>
                <div className="text-2xl font-bold">{totalDonations}</div>
              </div>
              <Droplet className="h-7 w-7 text-red-400" />
            </div>
            <div className="mt-3 text-[11px] text-slate-300">
              Thank you for your continuous support. Every donation counts.
            </div>
          </Card>

          <Card className="p-4 bg-slate-900/90 border-slate-700 text-white flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[11px] uppercase text-slate-400">
                  Lives saved (estimated)
                </div>
                <div className="text-2xl font-bold">{livesSaved}</div>
              </div>
            </div>
            <div className="mt-3 text-[11px] text-slate-300">
              We estimate each successful donation can support up to 3 patients.
            </div>
          </Card>

          <Card className="p-4 bg-slate-900/90 border-slate-700 text-white flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[11px] uppercase text-slate-400">
                  Last donation
                </div>
                <div className="text-sm font-semibold">
                  {lastDonation
                    ? `${formatDate(lastDonation.date)} • ${formatTime(
                        lastDonation.timeSlot
                      )}`
                    : "No completed donation yet"}
                </div>
              </div>
              <CalendarDays className="h-6 w-6 text-blue-300" />
            </div>
            {lastDonation?.location && (
              <div className="mt-3 flex items-center gap-1 text-[11px] text-slate-300">
                <MapPin className="h-3 w-3" />
                {lastDonation.location.name}
                {lastDonation.location.city
                  ? ` • ${lastDonation.location.city}`
                  : ""}
              </div>
            )}
          </Card>
        </section>

        {/* Small chart */}
        <Card className="p-4 bg-slate-900/90 border-slate-700 text-white">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-xs font-semibold">Donations per month</div>
              <div className="text-[11px] text-slate-300">
                Last {monthlyData.length || 0} months
              </div>
            </div>
          </div>

          {monthlyData.length === 0 ? (
            <p className="text-xs text-slate-400">
              No completed donations yet to display chart.
            </p>
          ) : (
            <div className="space-y-2">
              {monthlyData.map((m) => (
                <div key={m.label} className="flex items-center gap-2 text-xs">
                  <div className="w-10 text-right text-slate-300">
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
                  <div className="w-6 text-left text-slate-200">{m.count}</div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* History table + filters */}
        <section className="space-y-3">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => handleStatusChange("COMPLETED")}
                className={statusChipClass("COMPLETED")}
              >
                Completed
              </button>
              <button
                type="button"
                onClick={() => handleStatusChange("CANCELLED")}
                className={statusChipClass("CANCELLED")}
              >
                Cancelled
              </button>
              <button
                type="button"
                onClick={() => handleStatusChange("ALL")}
                className={statusChipClass("ALL")}
              >
                All
              </button>
            </div>

            <div className="flex items-center gap-2 w-full md:w-72">
              <Label
                htmlFor="search"
                className="text-[11px] text-slate-300 whitespace-nowrap"
              >
                Search
              </Label>
              <div className="relative flex-1">
                <Search className="h-3.5 w-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  id="search"
                  placeholder="Filter by date, location, city…"
                  value={search}
                  onChange={handleSearchChange}
                  className="pl-7 bg-slate-950 border-slate-700 text-white text-xs"
                />
              </div>
            </div>
          </div>

          <Card className="overflow-hidden bg-slate-900/90 border-slate-700 text-white">
            <div className="max-h-[420px] overflow-auto">
              <table className="min-w-full text-xs">
                <thead className="bg-slate-950/80 sticky top-0 z-10">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold text-slate-300">
                      Date
                    </th>
                    <th className="px-3 py-2 text-left font-semibold text-slate-300">
                      Time
                    </th>
                    <th className="px-3 py-2 text-left font-semibold text-slate-300">
                      Location
                    </th>
                    <th className="px-3 py-2 text-left font-semibold text-slate-300">
                      City
                    </th>
                    <th className="px-3 py-2 text-left font-semibold text-slate-300">
                      Status
                    </th>
                    <th className="px-3 py-2 text-right font-semibold text-slate-300">
                      Units
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-3 py-4 text-center text-slate-400"
                      >
                        Loading donation history…
                      </td>
                    </tr>
                  ) : filteredDonations.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-3 py-4 text-center text-slate-400"
                      >
                        No donations found for this filter.
                      </td>
                    </tr>
                  ) : (
                    filteredDonations.map((d) => (
                      <tr
                        key={d._id}
                        className="border-t border-slate-800 hover:bg-slate-800/60"
                      >
                        <td className="px-3 py-2">
                          {formatDate(d.date)}
                        </td>
                        <td className="px-3 py-2">
                          {formatTime(d.timeSlot)}
                        </td>
                        <td className="px-3 py-2">
                          {d.location?.name || "-"}
                        </td>
                        <td className="px-3 py-2">
                          {d.location?.city || "-"}
                        </td>
                        <td className="px-3 py-2">
                          <span
                            className={[
                              "inline-flex rounded-full px-2 py-0.5 border text-[10px] font-semibold",
                              d.status === "COMPLETED"
                                ? "bg-emerald-500/15 border-emerald-400/60 text-emerald-100"
                                : "bg-slate-600/20 border-slate-400/60 text-slate-100",
                            ].join(" ")}
                          >
                            {d.status.toLowerCase()}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right">
                          {d.unitsDonated != null ? d.unitsDonated : "-"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          {error && (
            <p className="text-xs text-red-400 bg-red-950/40 border border-red-700/60 rounded px-3 py-2">
              {error}
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
