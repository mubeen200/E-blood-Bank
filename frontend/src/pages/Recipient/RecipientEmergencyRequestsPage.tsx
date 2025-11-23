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
import { AlertTriangle, PhoneCall } from "lucide-react";

type LocationOption = {
  _id: string;
  name: string;
  city?: string;
  address?: string;
};

export function RecipientEmergencyRequestsPage() {
  const { user } = useAuth();
  const bloodType = user?.bloodType || "";

  const [locations, setLocations] = useState<LocationOption[]>([]);
  const [loadingLocations, setLoadingLocations] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    units: "1",
    locationId: "",
    reason: "",
    currentLocation: "",
    contactPhone: "",
  });

  // Load locations that have stock for this blood type
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

        // Auto-select first location if none chosen yet
        if (!form.locationId && list.length > 0) {
          setForm((prev) => ({ ...prev, locationId: list[0]._id }));
        }
      } catch (err) {
        console.error("load emergency locations error", err);
        toast.error("Failed to load locations. Please try again.");
      } finally {
        setLoadingLocations(false);
      }
    };

    fetchLocations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bloodType]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!bloodType) {
      toast.error("Blood type missing. Please set it in your profile first.");
      return;
    }

    if (
      !form.units ||
      !form.locationId ||
      !form.currentLocation.trim() ||
      !form.contactPhone.trim()
    ) {
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
        urgency: "HIGH", // emergency = always HIGH
        reason: form.reason.trim() || undefined,
        locationId: form.locationId,
        isEmergency: true,
        currentLocation: form.currentLocation.trim(),
        contactPhone: form.contactPhone.trim(),
      };

      await api.post("/recipient/requests", payload);

      toast.success(
        "Emergency request submitted. Please go to the selected hospital / blood bank immediately."
      );

      // Reset only the text fields, keep location
      setForm((prev) => ({
        ...prev,
        units: "1",
        reason: "",
        currentLocation: "",
        contactPhone: "",
      }));
    } catch (err: any) {
      console.error("submit emergency request error", err);
      const msg =
        err?.response?.data?.message ||
        "Failed to submit emergency request. Please try again.";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Sidebar */}
      <div className="w-full lg:w-72 shrink-0">
        <RecipientSidebar active="emergency" />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col gap-6">
        {/* Header */}
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
            Emergency Blood Request
          </h1>
          <p className="text-sm text-slate-300 max-w-2xl">
            Use this when you or a patient needs blood urgently. We’ll send a
            high-priority request to the selected blood bank / hospital.
          </p>
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,2.1fr)_minmax(0,1.3fr)]">
          {/* Simple emergency form */}
          <Card className="bg-slate-900/90 border-slate-800 text-white p-6 space-y-5">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-red-600/90 border border-red-300/70 shadow">
                <AlertTriangle className="h-5 w-5" />
              </span>
              <div>
                <h2 className="font-semibold text-lg">Request details</h2>
                <p className="text-xs text-slate-300">
                  Emergency requests are always treated as{" "}
                  <span className="font-semibold text-red-300">high urgency</span>.
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Blood type & units */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1">
                  <Label>Blood type</Label>
                  <Input
                    value={bloodType || "Not set"}
                    disabled
                    className="bg-slate-950 border-slate-700 text-sm"
                  />
                  {!bloodType && (
                    <p className="text-xs text-amber-300">
                      Set your blood type in your profile so emergencies can be
                      handled correctly.
                    </p>
                  )}
                </div>

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
                    className="bg-slate-950 border-slate-700 text-sm"
                  />
                </div>
              </div>

              {/* Location selection */}
              <div className="space-y-1">
                <Label>
                  Blood bank / hospital <span className="text-red-400">*</span>
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
                          : "Select nearest blood bank / hospital"
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
                    No locations available yet for this blood type.
                  </p>
                )}
              </div>

              {/* Where is the patient now */}
              <div className="space-y-1">
                <Label>
                  Current location / address{" "}
                  <span className="text-red-400">*</span>
                </Label>
                <textarea
                  rows={3}
                  value={form.currentLocation}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      currentLocation: e.target.value,
                    }))
                  }
                  placeholder="e.g., Emergency ward, Jinnah Hospital, Lahore or Home – House 123, Street XYZ…"
                  className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Contact phone */}
              <div className="space-y-1">
                <Label>
                  Contact phone <span className="text-red-400">*</span>
                </Label>
                <Input
                  type="tel"
                  value={form.contactPhone}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      contactPhone: e.target.value,
                    }))
                  }
                  placeholder="e.g., 0300-1234567"
                  className="bg-slate-950 border-slate-700 text-sm"
                />
              </div>

              {/* Optional reason */}
              <div className="space-y-1">
                <Label>Reason (optional)</Label>
                <textarea
                  rows={3}
                  value={form.reason}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, reason: e.target.value }))
                  }
                  placeholder="e.g., road traffic accident, severe bleeding, thalassemia crisis…"
                  className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Footer actions */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pt-2">
                <p className="text-xs text-slate-400 max-w-md">
                  This form alerts the blood bank. In an emergency, also{" "}
                  <span className="font-semibold text-red-300">
                    call your local emergency number and go to the hospital
                    immediately.
                  </span>
                </p>
                <Button
                  type="submit"
                  disabled={submitting || !bloodType}
                  className="bg-red-600 hover:bg-red-500 text-white px-6"
                >
                  {submitting ? "Sending…" : "Send emergency request"}
                </Button>
              </div>
            </form>
          </Card>

          {/* Simple info card */}
          <Card className="bg-slate-900/90 border-slate-800 text-white p-5 space-y-3 text-sm">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-blue-600/90 border border-blue-300/70 shadow">
                <PhoneCall className="h-5 w-5" />
              </span>
              <div>
                <p className="font-semibold text-base">Important safety notes</p>
                <p className="text-xs text-slate-300">
                  This app helps the blood bank prepare units, but it does not
                  replace medical care.
                </p>
              </div>
            </div>

            <ul className="list-disc pl-4 space-y-1 text-xs text-slate-300">
              <li>
                Always contact ambulance / emergency services first in
                life-threatening situations.
              </li>
              <li>
                Go to the nearest hospital even after submitting this request.
              </li>
              <li>
                Keep your phone available. The blood bank team may call you for
                confirmation or instructions.
              </li>
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
