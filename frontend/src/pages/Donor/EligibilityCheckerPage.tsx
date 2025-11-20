import { useEffect, useMemo, useState } from "react";
import api from "@/api/axiosClient";
import { DonorSidebar } from "@/components/layout/DonorSidebar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import {
  ShieldCheck,
  CalendarDays,
  Activity,
  Info,
  HeartPulse,
} from "lucide-react";

type Overview = {
  eligibility: {
    eligible: boolean;
    reasons: string[];
  };
  nextEligibleDonationDate: string | null;
};

type Donation = {
  _id: string;
  date: string;
  status: "COMPLETED" | "CANCELLED" | "SCHEDULED";
};

export function EligibilityCheckerPage() {
  const { user } = useAuth();

  const [overview, setOverview] = useState<Overview | null>(null);
  const [lastCompletedDonation, setLastCompletedDonation] =
    useState<Donation | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const age =
  user && typeof user.age === "number" ? user.age : undefined;

const weight =
  user && typeof user.weight === "number" ? user.weight : undefined;

const healthCondition =
  user && typeof user.healthCondition === "string"
    ? user.healthCondition
    : "";

  const formatDate = (value: string) =>
    new Date(value).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

  const nextEligibleText = overview?.nextEligibleDonationDate
    ? formatDate(overview.nextEligibleDonationDate)
    : "Not set yet";

  const isEligible = overview?.eligibility.eligible ?? false;
  const reasons = overview?.eligibility.reasons ?? [];

  const ageCheck = useMemo(() => {
    if (age == null) return { ok: false, msg: "Age not provided." };
    if (age < 18) return { ok: false, msg: "Minimum age is 18 years." };
    if (age > 70) return { ok: false, msg: "Maximum age is 70 years." };
    return { ok: true, msg: "Age within safe donation range (18–70 years)." };
  }, [age]);

  const weightCheck = useMemo(() => {
    if (weight == null) return { ok: false, msg: "Weight not provided." };
    if (weight < 40)
      return {
        ok: false,
        msg: "Weight must be at least 40 kg for safe donation.",
      };
    return { ok: true, msg: "Weight meets minimum requirement (≥ 40 kg)." };
  }, [weight]);

  const intervalCheck = useMemo(() => {
    if (!overview?.nextEligibleDonationDate) {
      // No next date set ⇒ either never donated OR backend hasn't derived it.
      if (!lastCompletedDonation) {
        return {
          ok: true,
          msg: "No completed donations yet. You can donate as long as age/weight criteria are met.",
        };
      }
      return {
        ok: true,
        msg: "Completed donations found, but interval is not restricted.",
      };
    }

    const next = new Date(overview.nextEligibleDonationDate);
    next.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (next > today) {
      return {
        ok: false,
        msg: `You can donate again after ${next.toLocaleDateString()}.`,
      };
    }

    return {
      ok: true,
      msg: "Donation interval is okay based on your last donation.",
    };
  }, [overview, lastCompletedDonation]);

  const healthCheck = useMemo(() => {
    if (!healthCondition) {
      return {
        ok: true,
        msg: "No health condition recorded. If you have any chronic illness, please inform the staff.",
      };
    }
    return {
      ok: true,
      msg: "Health condition recorded. The blood bank staff will review it and may ask additional questions.",
    };
  }, [healthCondition]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const [ovRes, donRes] = await Promise.allSettled([
          api.get("/donor/overview"),
          api.get("/donor/donations?status=COMPLETED"),
        ]);

        let anySuccess = false;

        if (ovRes.status === "fulfilled") {
          setOverview(ovRes.value.data);
          anySuccess = true;
        } else {
          console.error(
            "Eligibility overview error:",
            ovRes.reason || ovRes
          );
        }

        if (donRes.status === "fulfilled") {
          const list: Donation[] = donRes.value.data.donations || [];
          setLastCompletedDonation(list[0] || null);
          anySuccess = true;
        } else {
          console.error(
            "Eligibility donations error:",
            donRes.reason || donRes
          );
        }

        if (!anySuccess) {
          const msg = "Failed to load eligibility data.";
          setError(msg);
          toast.error(msg);
        }
      } catch (err: any) {
        console.error("Eligibility fatal error:", err);
        const msg =
          err?.response?.data?.message ||
          err?.message ||
          "Failed to load eligibility data.";
        setError(msg);
        toast.error(msg);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  return (
    <div className="flex gap-6">
      <DonorSidebar />

      <div className="flex-1 space-y-6">
        {/* Header */}
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-red-400" />
            Eligibility Checker
          </h1>
          <p className="text-sm text-slate-300">
            See if you are currently eligible to donate, based on your age,
            weight, last donation date, and basic health info.
          </p>
        </div>

        {/* Summary card */}
        <Card
          className={[
            "p-4 border text-white",
            isEligible
              ? "bg-emerald-800/80 border-emerald-500"
              : "bg-red-900/80 border-red-500",
          ].join(" ")}
        >
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-black/20">
                <ShieldCheck className="h-5 w-5 text-white" />
              </div>
              <div>
                <div className="text-xs font-semibold uppercase">
                  Current status
                </div>
                <div className="text-sm font-semibold">
                  {isEligible ? "You are currently eligible to donate." : "You are not currently eligible to donate."}
                </div>
                <p className="text-[11px] mt-1">
                  Next eligible donation date:{" "}
                  <span className="font-semibold">{nextEligibleText}</span>
                </p>
              </div>
            </div>

            <div className="text-[11px] text-red-100/90 md:text-right">
              {reasons.length === 0 ? (
                <p>No blocking issues detected from the saved data.</p>
              ) : (
                <>
                  <p className="font-semibold mb-1">Why you might not be eligible:</p>
                  <ul className="space-y-0.5 list-disc list-inside">
                    {reasons.map((r, idx) => (
                      <li key={idx}>{r}</li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          </div>
        </Card>

        {/* Checklist */}
        <section className="grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
          {/* Left: criteria cards */}
          <div className="space-y-3">
            {/* Age */}
            <Card className="p-4 bg-slate-900/90 border-slate-700 text-white">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <div className="text-xs font-semibold uppercase">
                    Age criterion
                  </div>
                  <p className="text-[11px] text-slate-300">
                    Donors should generally be between 18 and 70 years old.
                  </p>
                </div>
                <div
                  className={[
                    "px-2 py-0.5 rounded-full text-[10px] font-semibold border",
                    ageCheck.ok
                      ? "bg-emerald-500/10 text-emerald-100 border-emerald-400/70"
                      : "bg-red-500/10 text-red-100 border-red-400/70",
                  ].join(" ")}
                >
                  {ageCheck.ok ? "Pass" : "Check"}
                </div>
              </div>
              <div className="text-sm font-semibold mb-1">
                Your age:{" "}
                {age != null ? (
                  <span>{age} years</span>
                ) : (
                  <span className="text-slate-300">Not provided</span>
                )}
              </div>
              <p className="text-[11px] text-slate-300">{ageCheck.msg}</p>
            </Card>

            {/* Weight */}
            <Card className="p-4 bg-slate-900/90 border-slate-700 text-white">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <div className="text-xs font-semibold uppercase">
                    Weight criterion
                  </div>
                  <p className="text-[11px] text-slate-300">
                    Minimum recommended weight is 40 kg for whole blood
                    donation.
                  </p>
                </div>
                <div
                  className={[
                    "px-2 py-0.5 rounded-full text-[10px] font-semibold border",
                    weightCheck.ok
                      ? "bg-emerald-500/10 text-emerald-100 border-emerald-400/70"
                      : "bg-red-500/10 text-red-100 border-red-400/70",
                  ].join(" ")}
                >
                  {weightCheck.ok ? "Pass" : "Check"}
                </div>
              </div>
              <div className="text-sm font-semibold mb-1">
                Your weight:{" "}
                {weight != null ? (
                  <span>{weight} kg</span>
                ) : (
                  <span className="text-slate-300">Not provided</span>
                )}
              </div>
              <p className="text-[11px] text-slate-300">{weightCheck.msg}</p>
            </Card>

            {/* Interval */}
            <Card className="p-4 bg-slate-900/90 border-slate-700 text-white">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <div className="text-xs font-semibold uppercase">
                    Donation interval
                  </div>
                  <p className="text-[11px] text-slate-300">
                    For whole blood, many centers require at least 8 weeks
                    between donations.
                  </p>
                </div>
                <CalendarDays className="h-4 w-4 text-blue-300" />
              </div>
              <div className="text-sm font-semibold mb-1">
                Last completed donation:{" "}
                {lastCompletedDonation ? (
                  <span>{formatDate(lastCompletedDonation.date)}</span>
                ) : (
                  <span className="text-slate-300">No completed donation yet</span>
                )}
              </div>
              <p className="text-[11px] text-slate-300">{intervalCheck.msg}</p>
            </Card>

            {/* Health */}
            <Card className="p-4 bg-slate-900/90 border-slate-700 text-white">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <div className="text-xs font-semibold uppercase">
                    Health status
                  </div>
                  <p className="text-[11px] text-slate-300">
                    Certain chronic illnesses or recent surgeries may require
                    extra checking by staff.
                  </p>
                </div>
                <HeartPulse className="h-4 w-4 text-pink-300" />
              </div>
              <div className="text-sm font-semibold mb-1">
                Your note:{" "}
                {healthCondition ? (
                  <span className="text-slate-100">{healthCondition}</span>
                ) : (
                  <span className="text-slate-300">None recorded</span>
                )}
              </div>
              <p className="text-[11px] text-slate-300">{healthCheck.msg}</p>
            </Card>
          </div>

          {/* Right: tips & info */}
          <div className="space-y-3">
            <Card className="p-4 bg-slate-900/90 border-slate-700 text-white">
              <div className="flex items-center gap-2 mb-2">
                <Activity className="h-4 w-4 text-emerald-300" />
                <div className="text-xs font-semibold uppercase">
                  Quick summary
                </div>
              </div>
              <ul className="text-[11px] text-slate-300 space-y-1">
                <li>
                  • All <span className="font-semibold">“Pass”</span> checks
                  usually mean you are clear to donate.
                </li>
                <li>
                  • Any <span className="font-semibold">“Check”</span> mark
                  means you should wait or talk to the blood bank staff.
                </li>
                <li>
                  • Staff may ask extra questions about your health to keep both
                  you and recipients safe.
                </li>
              </ul>
            </Card>

            <Card className="p-4 bg-slate-900/90 border-slate-700 text-white">
              <div className="flex items-center gap-2 mb-2">
                <Info className="h-4 w-4 text-blue-300" />
                <div className="text-xs font-semibold uppercase">
                  What should I do next?
                </div>
              </div>
              <p className="text-[11px] text-slate-300 mb-3">
                If your age/weight/interval checks pass and you feel healthy,
                you can go ahead and book a donation appointment from the{" "}
                <span className="font-semibold">Donate Blood</span> page.
              </p>
              <Button
                type="button"
                size="sm"
                className="bg-red-600 hover:bg-red-700 text-white"
                onClick={() => {
                  // navigate using a simple href to avoid pulling useNavigate
                  window.location.href = "/donor/donate";
                }}
              >
                Go to Donate Blood
              </Button>
            </Card>

            {error && (
              <p className="text-xs text-red-400 bg-red-950/40 border border-red-700/60 rounded px-3 py-2">
                {error}
              </p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
