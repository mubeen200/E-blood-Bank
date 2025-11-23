import { useEffect, useState, FormEvent } from "react";
import { RecipientSidebar } from "@/components/layout/RecipientSidebar";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/context/AuthContext";
import api from "@/api/axiosClient";
import { toast } from "sonner";
import { Droplet, AlertTriangle } from "lucide-react";

type LocationOption = {
  _id: string;
  name: string;
  address?: string;
  city?: string;
};

const URGENCY_LEVELS = [
  { value: "LOW", label: "Low (planned / elective)" },
  { value: "MEDIUM", label: "Medium (soon, but not critical)" },
  { value: "HIGH", label: "High (urgent / critical)" },
];

const compatibilityMap: Record<
  string,
  { canReceiveFrom: string[]; note?: string }
> = {
  "O-": { canReceiveFrom: ["O-"], note: "Universal donor, strict receiver." },
  "O+": { canReceiveFrom: ["O+", "O-"] },
  "A-": { canReceiveFrom: ["A-", "O-"] },
  "A+": { canReceiveFrom: ["A+", "A-", "O+", "O-"] },
  "B-": { canReceiveFrom: ["B-", "O-"] },
  "B+": { canReceiveFrom: ["B+", "B-", "O+", "O-"] },
  "AB-": { canReceiveFrom: ["AB-", "A-", "B-", "O-"] },
  "AB+": {
    canReceiveFrom: ["AB+", "AB-", "A+", "A-", "B+", "B-", "O+", "O-"],
    note: "Universal recipient.",
  },
};

export function RequestBloodPage() {
  const { user } = useAuth();
  const [locations, setLocations] = useState<LocationOption[]>([]);
  const [loadingLocations, setLoadingLocations] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    units: "",
    urgency: "HIGH",
    reason: "",
    locationId: "",
  });

  const bloodType = user?.bloodType || "";

  // Load locations where this blood type is available
  useEffect(() => {
    const fetchLocations = async () => {
      if (!bloodType) return;

      try {
        setLoadingLocations(true);
        const res = await api.get("/recipient/locations", {
          params: { bloodType },
        });
        const list: LocationOption[] = res.data?.locations || [];
        setLocations(list);

        // preselect first location if none chosen
        if (!form.locationId && list.length > 0) {
          setForm((prev) => ({ ...prev, locationId: list[0]._id }));
        }
      } catch (err) {
        console.error("Failed to load locations", err);
        toast.error("Failed to load locations. You can try again later.");
      } finally {
        setLoadingLocations(false);
      }
    };

    fetchLocations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bloodType]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!form.units || !form.locationId || !form.urgency) {
      toast.error("Please fill in all required fields.");
      return;
    }

    const unitsNumber = Number(form.units);
    if (!Number.isFinite(unitsNumber) || unitsNumber <= 0) {
      toast.error("Units needed must be a positive number.");
      return;
    }

    try {
      setSubmitting(true);

      const payload = {
        bloodType,
        units: unitsNumber,
        urgency: form.urgency,
        reason: form.reason.trim() || undefined,
        locationId: form.locationId,
      };

      // Expected backend endpoint – we'll implement this next.
      await api.post("/recipient/requests", payload);

      toast.success("Blood request submitted successfully.");
      // Later we can navigate to /recipient/requests after we build it
      setForm((prev) => ({
        ...prev,
        units: "",
        reason: "",
        // keep urgency + location as they are
      }));
    } catch (err: any) {
      console.error("submit request error", err);
      const msg =
        err?.response?.data?.message ||
        "Failed to submit blood request. Please try again.";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const compatibilityInfo = compatibilityMap[bloodType] || null;

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Sidebar */}
      <div className="w-full lg:w-72 shrink-0">
        <RecipientSidebar />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col gap-6">
        {/* Header */}
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
            Request Blood
          </h1>
          <p className="text-sm text-slate-300">
            Submit a new blood request with urgency, units, and location. We’ll
            use this to match available inventory and notify donors/admins.
          </p>
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1.4fr)]">
          {/* Request form */}
          <Card className="bg-slate-900/90 border-slate-800 text-white p-6 space-y-5">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-red-600/90 border border-red-300/70 shadow">
                <Droplet className="h-5 w-5" />
              </span>
              <div>
                <h2 className="font-semibold text-lg">Request details</h2>
                <p className="text-xs text-slate-300">
                  Your blood type is pre-filled. Please choose units, urgency,
                  reason and location.
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                {/* Blood type */}
                <div className="space-y-1">
                  <Label>Blood type</Label>
                  <Input
                    value={bloodType || "Not set"}
                    disabled
                    className="bg-slate-950 border-slate-700 text-sm"
                  />
                  {!bloodType && (
                    <p className="text-xs text-amber-300">
                      Your blood type is missing in your profile. Please update
                      it in Profile section later.
                    </p>
                  )}
                </div>

                {/* Units needed */}
                <div className="space-y-1">
                  <Label>
                    Units needed <span className="text-red-400">*</span>
                  </Label>
                  <Input
                    type="number"
                    min={1}
                    step={1}
                    value={form.units}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, units: e.target.value }))
                    }
                    placeholder="e.g., 2"
                    className="bg-slate-950 border-slate-700 text-sm"
                  />
                </div>
              </div>

              {/* Urgency & location */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1">
                  <Label>
                    Urgency level <span className="text-red-400">*</span>
                  </Label>
                  <Select
                    value={form.urgency}
                    onValueChange={(val) =>
                      setForm((prev) => ({ ...prev, urgency: val }))
                    }
                  >
                    <SelectTrigger className="bg-slate-950 border-slate-700 text-sm">
                      <SelectValue placeholder="Select urgency" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-700">
                      {URGENCY_LEVELS.map((u) => (
                        <SelectItem key={u.value} value={u.value}>
                          {u.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label>
                    Location <span className="text-red-400">*</span>
                  </Label>
                  <Select
                    value={form.locationId}
                    onValueChange={(val) =>
                      setForm((prev) => ({ ...prev, locationId: val }))
                    }
                    disabled={loadingLocations || locations.length === 0}
                  >
                    <SelectTrigger className="bg-slate-950 border-slate-700 text-sm">
                      <SelectValue
                        placeholder={
                          loadingLocations
                            ? "Loading locations..."
                            : "Select blood bank / hospital"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-700">
                      {locations.map((loc) => (
                        <SelectItem key={loc._id} value={loc._id}>
                          {loc.name}
                          {loc.city ? ` – ${loc.city}` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {locations.length === 0 && !loadingLocations && (
                    <p className="text-xs text-amber-300">
                      No locations available yet for this blood type. Admin can
                      add inventory later.
                    </p>
                  )}
                </div>
              </div>

              {/* Reason */}
              <div className="space-y-1">
                <Label>Reason / clinical details (optional)</Label>
                <textarea
                  value={form.reason}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, reason: e.target.value }))
                  }
                  rows={4}
                  placeholder="e.g., scheduled surgery, trauma case, thalassemia transfusion…"
                  className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pt-2">
                <p className="text-xs text-slate-400 max-w-md">
                  By submitting, you allow the blood bank team to review this
                  request and match it with available inventory and donors.
                </p>
                <Button
                  type="submit"
                  disabled={submitting || !bloodType}
                  className="bg-blue-600 hover:bg-blue-500 text-white px-6"
                >
                  {submitting ? "Submitting…" : "Submit blood request"}
                </Button>
              </div>
            </form>
          </Card>

          {/* Compatibility & tips */}
          <div className="flex flex-col gap-4">
            <Card className="bg-slate-900/90 border-slate-800 text-white p-5 space-y-3">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-blue-600/90 border border-blue-300/70 shadow">
                  <AlertTriangle className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="font-semibold text-base">
                    Compatibility helper
                  </h2>
                  <p className="text-xs text-slate-300">
                    Based on your blood type, these donor types are compatible.
                    Admin can use this to suggest alternatives.
                  </p>
                </div>
              </div>

              {bloodType && compatibilityInfo ? (
                <div className="space-y-2">
                  <p className="text-sm">
                    You are <span className="font-semibold">{bloodType}</span>.
                    You can receive blood from:
                  </p>
                  <p className="text-sm text-blue-200 font-medium">
                    {compatibilityInfo.canReceiveFrom.join(", ")}
                  </p>
                  {compatibilityInfo.note && (
                    <p className="text-xs text-slate-300">
                      Note: {compatibilityInfo.note}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-slate-300">
                  Set your blood type in your profile to see compatibility
                  details here.
                </p>
              )}

              <ul className="text-xs text-slate-300 list-disc pl-4 space-y-1 pt-1">
                <li>
                  In true emergencies, always contact the blood bank / hospital
                  directly while also submitting this form.
                </li>
                <li>
                  For planned surgeries, submit your request earlier so the team
                  can arrange matching units.
                </li>
              </ul>
            </Card>

            <Card className="bg-slate-900/90 border-slate-800 text-white p-4 text-xs space-y-1.5">
              <p className="font-semibold text-[11px] uppercase tracking-wide text-slate-300">
                What happens after you submit?
              </p>
              <ol className="space-y-1 list-decimal pl-4">
                <li>The request is saved with urgency and location.</li>
                <li>
                  Admin can see it in their dashboard and match it with
                  inventory.
                </li>
                <li>
                  In future steps, compatible donors for your blood type will be
                  notified.
                </li>
              </ol>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
