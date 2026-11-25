import { useEffect, useMemo, useState, FormEvent } from "react";
import api from "@/api/axiosClient";
import { DonorSidebar } from "@/components/layout/DonorSidebar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { CalendarDays, Clock, MapPin, Droplet } from "lucide-react";

type Overview = {
  eligibility: {
    eligible: boolean;
    reasons: string[];
  };
  nextEligibleDonationDate: string | null;
};

type Location = {
  _id: string;
  name: string;
  city?: string;
  address?: string;
  distanceKm?: number;
  isRecommended?: boolean;
  stockLevel?: "LOW" | "MEDIUM" | "HIGH";
};

type Appointment = {
  _id: string;
  date: string; // ISO
  timeSlot: string;
  status: "SCHEDULED" | "COMPLETED" | "CANCELLED";
  location: {
    _id: string;
    name: string;
    city?: string;
  };
};

const TIME_SLOTS = [
  "09:00",
  "09:30",
  "10:00",
  "10:30",
  "11:00",
  "11:30",
  "12:00",
  "12:30",
  "14:00",
  "14:30",
  "15:00",
  "15:30",
  "16:00",
];

export function DonateBloodPage() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);

  const [selectedLocationId, setSelectedLocationId] = useState("");
  const [date, setDate] = useState("");
  const [timeSlot, setTimeSlot] = useState("");

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [cancelingId, setCancelingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Compute min allowed date for appointment in local timezone (avoid UTC shift):
  const minDate = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let min = today;

    if (overview?.nextEligibleDonationDate) {
      const next = new Date(overview.nextEligibleDonationDate);
      next.setHours(0, 0, 0, 0);
      if (next > min) min = next;
    }
    const y = min.getFullYear();
    const m = String(min.getMonth() + 1).padStart(2, "0");
    const d = String(min.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }, [overview]);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [ovRes, locRes, apptRes] = await Promise.all([
          api.get("/donor/overview"),
          api.get("/donor/locations"),
          api.get("/donor/appointments"),
        ]);

        setOverview(ovRes.data);
        setLocations(locRes.data.locations || []);
        setAppointments(apptRes.data.appointments || []);
      } catch (err: any) {
        console.error("Donate page load error:", err);
        toast.error(
          err?.response?.data?.message || "Failed to load donate page data."
        );
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const recommendedLocations = locations.filter((l) => l.isRecommended);
  const otherLocations = locations.filter((l) => !l.isRecommended);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedLocationId || !date || !timeSlot) {
      setError("Please select a location, date, and time slot.");
      return;
    }

    // Extra safety: don't allow booking before minDate
    if (date < minDate) {
      setError("You cannot book an appointment before your eligible date.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        locationId: selectedLocationId,
        date,
        timeSlot,
      };

      const res = await api.post("/donor/appointments", payload);
      const newAppt: Appointment = res.data.appointment;

      setAppointments((prev) => [newAppt, ...prev]);
      toast.success("Appointment booked successfully!");

      // reset form
      setSelectedLocationId("");
      setDate("");
      setTimeSlot("");
    } catch (err: any) {
      console.error("Book appointment error:", err);
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to book appointment.";
      setError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async (id: string) => {
    setCancelingId(id);
    try {
      const res = await api.patch(`/donor/appointments/${id}/cancel`);
      const updated: Appointment = res.data.appointment;

      setAppointments((prev) =>
        prev.map((a) => (a._id === id ? updated : a))
      );
      toast.success("Appointment cancelled.");
    } catch (err: any) {
      console.error("Cancel appointment error:", err);
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to cancel appointment.";
      toast.error(msg);
    } finally {
      setCancelingId(null);
    }
  };

  const formatDate = (value: string) =>
    new Date(value).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

  return (
    <div className="flex gap-6">
      <DonorSidebar />

      <div className="flex-1 space-y-6">
        {/* Header */}
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <Droplet className="h-6 w-6 text-red-400" />
            Donate Blood
          </h1>
          <p className="text-sm text-slate-300">
            Choose a blood bank, pick a date and time, and confirm your next
            life-saving donation. We highlight locations where your blood type
            is most needed.
          </p>
        </div>

        {/* Eligibility summary */}
        {overview && (
          <Card className="p-4 bg-slate-900/90 border-slate-700 text-white">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div className="flex items-center gap-3">
                <CalendarDays className="h-5 w-5 text-blue-300" />
                <div>
                  <div className="text-xs uppercase tracking-wide text-slate-300">
                    Next eligible donation date
                  </div>
                  <div className="text-sm font-semibold">
                    {overview.nextEligibleDonationDate
                      ? formatDate(overview.nextEligibleDonationDate)
                      : "Not set yet"}
                  </div>
                </div>
              </div>

              <div className="text-xs text-slate-300">
                {overview.eligibility.eligible ? (
                  <span className="inline-flex items-center rounded-full bg-emerald-500/15 border border-emerald-400/60 px-3 py-1 text-emerald-100">
                    You are currently eligible to donate.
                  </span>
                ) : (
                  <span className="inline-flex items-center rounded-full bg-amber-500/15 border border-amber-400/60 px-3 py-1 text-amber-100">
                    You are not eligible to donate today, but you can book an
    appointment on or after your eligible date.
                  </span>
                )}
              </div>
            </div>
          </Card>
        )}

        {/* Main content: left = form & location list, right = appointments */}
        <section className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          {/* Left */}
          <div className="space-y-4">
            {/* Recommended locations */}
            <Card className="p-4 bg-slate-900/90 border-slate-700 text-white">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="text-sm font-semibold flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-red-300" />
                    Recommended blood banks
                  </h2>
                  <p className="text-[11px] text-slate-300">
                    Based on inventory and your blood type, these locations are
                    prioritized.
                  </p>
                </div>
              </div>

              {loading ? (
                <p className="text-xs text-slate-400">Loading locations...</p>
              ) : recommendedLocations.length === 0 ? (
                <p className="text-xs text-slate-400">
                  No specific recommendations yet. You can still book at any
                  available location below.
                </p>
              ) : (
                <div className="space-y-2">
                  {recommendedLocations.map((loc) => (
                    <button
                      key={loc._id}
                      type="button"
                      onClick={() => setSelectedLocationId(loc._id)}
                      className={[
                        "w-full rounded-xl border px-3 py-2 text-left text-xs transition-all",
                        selectedLocationId === loc._id
                          ? "border-red-400 bg-red-900/50"
                          : "border-slate-700 bg-slate-950/70 hover:bg-slate-900",
                      ].join(" ")}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-semibold text-sm">
                            {loc.name}
                          </div>
                          <div className="text-[11px] text-slate-300">
                            {loc.city || ""}{" "}
                            {loc.address ? `• ${loc.address}` : ""}
                          </div>
                        </div>
                        {loc.distanceKm !== undefined && (
                          <div className="text-[10px] text-slate-300">
                            ~{loc.distanceKm.toFixed(1)} km
                          </div>
                        )}
                      </div>
                      {loc.stockLevel && (
                        <div className="mt-1 text-[10px] text-slate-300">
                          Stock level:{" "}
                          <span className="font-semibold">{loc.stockLevel}</span>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </Card>

            {/* Donation form */}
            <Card className="p-4 bg-slate-900/90 border-slate-700 text-white">
              <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Droplet className="h-4 w-4 text-red-300" />
                Book a donation appointment
              </h2>

              <form className="space-y-4" onSubmit={handleSubmit}>
                <div className="space-y-2">
                  <Label htmlFor="location">Select blood bank</Label>
                  <select
                    id="location"
                    value={selectedLocationId}
                    onChange={(e) => setSelectedLocationId(e.target.value)}
                    className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
                  >
                    <option value="">Choose a location</option>
                    {locations.map((loc) => (
                      <option key={loc._id} value={loc._id}>
                        {loc.name}
                        {loc.city ? ` • ${loc.city}` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col md:flex-row gap-3">
                  <div className="flex-1 space-y-2">
                    <Label htmlFor="date">Preferred date</Label>
                    <Input
                      id="date"
                      type="date"
                      min={minDate}
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="bg-slate-950 border-slate-700 text-white"
                    />
                  </div>

                  <div className="flex-1 space-y-2">
                    <Label htmlFor="time">Time slot</Label>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-slate-300" />
                      <select
                        id="time"
                        value={timeSlot}
                        onChange={(e) => setTimeSlot(e.target.value)}
                        className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
                      >
                        <option value="">Choose a time</option>
                        {TIME_SLOTS.map((slot) => (
                          <option key={slot} value={slot}>
                            {slot}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {error && (
                  <p className="text-sm text-red-400 bg-red-950/40 border border-red-700/60 rounded px-3 py-2">
                    {error}
                  </p>
                )}

                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold"
                >
                  {submitting ? "Booking appointment..." : "Confirm Appointment"}
                </Button>

                <p className="text-[11px] text-slate-400">
                  Note: You cannot book an appointment before your eligible
                  date. The blood bank may contact you for confirmation.
                </p>
              </form>
            </Card>
          </div>

          {/* Right: upcoming appointments */}
          <Card className="p-4 bg-slate-900/90 border-slate-700 text-white">
            <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-blue-300" />
              Upcoming appointments
            </h2>

            {loading ? (
              <p className="text-xs text-slate-400">
                Loading appointments...
              </p>
            ) : appointments.length === 0 ? (
              <p className="text-xs text-slate-400">
                No upcoming appointments. Book one on the left to get started.
              </p>
            ) : (
              <div className="space-y-2 text-xs">
                {appointments.map((appt) => (
                  <div
                    key={appt._id}
                    className="flex flex-col gap-2 rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <div className="font-semibold">
                          {appt.location?.name || "Blood Bank"}
                        </div>
                        <div className="text-[11px] text-slate-300">
                          {appt.location?.city || ""}{" "}
                          {appt.date ? `• ${formatDate(appt.date)}` : ""} •{" "}
                          {appt.timeSlot}
                        </div>
                      </div>
                      <span
                        className={[
                          "rounded-full border px-2 py-0.5 text-[10px] font-semibold",
                          appt.status === "SCHEDULED"
                            ? "bg-blue-500/15 border-blue-400/60 text-blue-100"
                            : appt.status === "COMPLETED"
                            ? "bg-emerald-500/15 border-emerald-400/60 text-emerald-100"
                            : "bg-slate-600/20 border-slate-400/60 text-slate-100",
                        ].join(" ")}
                      >
                        {appt.status.toLowerCase()}
                      </span>
                    </div>

                    {appt.status === "SCHEDULED" && (
                      <div className="flex justify-end">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={cancelingId === appt._id}
                          onClick={() => handleCancel(appt._id)}
                          className="h-7 border-red-400/70 text-red-100 hover:bg-red-900/60 bg-red-950/30"
                        >
                          {cancelingId === appt._id
                            ? "Cancelling..."
                            : "Cancel"}
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </section>
      </div>
    </div>
  );
}
