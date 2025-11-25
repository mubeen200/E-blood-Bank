// src/pages/Admin/AdminInventoryPage.tsx
import { useEffect, useMemo, useState, ChangeEvent } from "react";
import api from "@/api/axiosClient";
import { AdminSidebar } from "@/components/layout/AdminSidebar";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Search,
  Droplet,
  MapPin,
  AlertTriangle,
  LayoutGrid,
} from "lucide-react";

type InventoryItem = {
  bloodType: string;
  units: number;
  capacity: number;
};

type LocationInventory = {
  id: string;
  name: string;
  city?: string;
  address?: string;
  phone?: string;
  totalUnits: number;
  lowOrEmptyCount: number;
  inventory: InventoryItem[];
};

type InventoryResponse = {
  locations: LocationInventory[];
  totalLocations: number;
};

function statusForInventory(item: InventoryItem) {
  const ratio = item.capacity > 0 ? item.units / item.capacity : 0;
  if (item.units === 0) return { label: "Empty", level: "EMPTY" as const };
  if (ratio < 0.25) return { label: "Low", level: "LOW" as const };
  if (ratio < 0.75) return { label: "Medium", level: "MEDIUM" as const };
  return { label: "High", level: "HIGH" as const };
}

function statusChipClasses(level: "EMPTY" | "LOW" | "MEDIUM" | "HIGH") {
  switch (level) {
    case "EMPTY":
      return "bg-slate-700/40 border-slate-400/70 text-slate-100";
    case "LOW":
      return "bg-amber-500/15 border-amber-400/70 text-amber-100";
    case "MEDIUM":
      return "bg-blue-500/15 border-blue-400/70 text-blue-100";
    case "HIGH":
    default:
      return "bg-emerald-500/15 border-emerald-400/70 text-emerald-100";
  }
}

export function AdminInventoryPage() {
  const [locations, setLocations] = useState<LocationInventory[]>([]);
  const [totalLocations, setTotalLocations] = useState(0);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [onlyLowEmpty, setOnlyLowEmpty] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await api.get<InventoryResponse>("/admin/inventory");
        setLocations(res.data.locations || []);
        setTotalLocations(
          res.data.totalLocations ?? (res.data.locations || []).length
        );
      } catch (err: any) {
        console.error("Admin inventory load error:", err);
        toast.error(
          err?.response?.data?.message || "Failed to load inventory."
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

  const filteredLocations = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = locations;

    if (q) {
      list = list.filter((loc) => {
        const haystack = [
          loc.name,
          loc.city || "",
          loc.address || "",
          loc.phone || "",
        ]
          .join(" ")
          .toLowerCase();
        return haystack.includes(q);
      });
    }

    if (onlyLowEmpty) {
      list = list
        .map((loc) => ({
          ...loc,
          inventory: loc.inventory.filter((inv) => {
            const { level } = statusForInventory(inv);
            return level === "LOW" || level === "EMPTY";
          }),
        }))
        .filter((loc) => loc.inventory.length > 0);
    }

    return list;
  }, [locations, search, onlyLowEmpty]);

  const visibleLocations = filteredLocations.length;

  return (
    <div className="flex gap-6">
      <AdminSidebar />

      <div className="flex-1 space-y-6">
        {/* Header */}
        <div className="space-y-1">
          <h1 className="text-2xl md:text-3xl font-semibold">
            Blood Inventory
          </h1>
          <p className="text-sm text-slate-300">
            View blood stock levels <span className="font-semibold">per location</span>.
            Quickly spot low or empty blood groups across your blood banks.
          </p>
        </div>

        {/* Search + filters */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="relative w-full md:max-w-md">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              value={search}
              onChange={handleSearchChange}
              placeholder="Search locations by name, city or address..."
              className="pl-9 bg-slate-900/90 border-slate-700 text-sm text-white placeholder:text-slate-400"
            />
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300">
            <div className="flex items-center gap-1">
              <MapPin className="h-4 w-4 text-pink-300" />
              <span>Locations:</span>
              <span className="font-semibold">{totalLocations}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setOnlyLowEmpty((v) => !v)}
                className={[
                  "inline-flex items-center gap-1 rounded-full border px-3 py-1 transition-colors",
                  onlyLowEmpty
                    ? "bg-amber-500/20 border-amber-400/80 text-amber-50"
                    : "bg-slate-800/70 border-slate-600 text-slate-200",
                ].join(" ")}
              >
                <AlertTriangle className="h-3 w-3" />
                <span>Only low / empty stock</span>
              </button>
            </div>
          </div>
        </div>

        {/* Locations inventory */}
        <Card className="bg-slate-900/90 border-slate-700 text-white p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="text-xs uppercase tracking-wide text-slate-400">
                Locations ({visibleLocations})
              </div>
              <p className="text-[11px] text-slate-400">
                Each card shows 8 blood groups for that location.
              </p>
            </div>
            <LayoutGrid className="h-4 w-4 text-slate-400" />
          </div>

          {loading ? (
            <p className="text-xs text-slate-400">Loading inventory…</p>
          ) : visibleLocations === 0 ? (
            <p className="text-xs text-slate-400">
              No locations match your filters.
            </p>
          ) : (
            <div className="grid gap-4 lg:grid-cols-3 md:grid-cols-2">
              {filteredLocations.map((loc) => (
                <div
                  key={loc.id}
                  className="rounded-2xl border border-slate-700 bg-slate-950/80 p-4 flex flex-col gap-3"
                >
                  {/* Location header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-0.5">
                      <div className="text-sm font-semibold">
                        {loc.name}
                      </div>
                      <div className="text-[11px] text-slate-300">
                        {loc.city}
                        {loc.address ? ` • ${loc.address}` : ""}
                      </div>
                      {loc.phone && (
                        <div className="text-[11px] text-slate-400">
                          {loc.phone}
                        </div>
                      )}
                    </div>

                    <div className="text-right text-[11px]">
                      <div className="text-slate-400 uppercase tracking-wide">
                        Total units
                      </div>
                      <div className="text-lg font-semibold">
                        {loc.totalUnits}
                      </div>
                      <div className="mt-1 inline-flex items-center rounded-full bg-amber-500/10 border border-amber-400/60 px-2 py-0.5 text-[10px] text-amber-100">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        {loc.lowOrEmptyCount} low / empty groups
                      </div>
                    </div>
                  </div>

                  {/* Inventory grid – this is where layout is fixed */}
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    {loc.inventory.map((inv) => {
                      const { label, level } = statusForInventory(inv);

                      return (
                        <div
                          key={inv.bloodType}
                          className="rounded-xl border border-slate-700 bg-slate-950 px-2 py-2 flex flex-col gap-1"
                        >
                          {/* Top row: blood type + status chip (no overlap) */}
                          <div className="flex items-center justify-between gap-1">
                            <div className="inline-flex items-center gap-1">
                              <Droplet className="h-3 w-3 text-red-300" />
                              <span className="font-semibold">
                                {inv.bloodType}
                              </span>
                            </div>
                            <span
                              className={[
                                "rounded-full border px-2 py-0.5 text-[10px] capitalize",
                                statusChipClasses(level),
                              ].join(" ")}
                            >
                              {label.toLowerCase()}
                            </span>
                          </div>

                          {/* Bottom row: units line – clear “Units: X / Y” */}
                          <div className="text-[10px] text-slate-300">
                            Units:{" "}
                            <span className="font-semibold">
                              {inv.units}
                            </span>
                            <span className="text-slate-400">
                              {" "}
                              / {inv.capacity}
                            </span>
                          </div>
                        </div>
                      );
                    })}
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
