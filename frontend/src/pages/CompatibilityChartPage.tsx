// src/pages/CompatibilityChartPage.tsx
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Droplet } from "lucide-react";

const BLOOD_TYPES = ["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"] as const;
type BloodType = (typeof BLOOD_TYPES)[number];

// RBC compatibility matrix: who a donor can give TO
const DONOR_COMPAT: Record<BloodType, BloodType[]> = {
  "O-": ["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"],
  "O+": ["O+", "A+", "B+", "AB+"],
  "A-": ["A-", "A+", "AB-", "AB+"],
  "A+": ["A+", "AB+"],
  "B-": ["B-", "B+", "AB-", "AB+"],
  "B+": ["B+", "AB+"],
  "AB-": ["AB-", "AB+"],
  "AB+": ["AB+"],
};

function isCompatible(donor: BloodType, recipient: BloodType) {
  return DONOR_COMPAT[donor].includes(recipient);
}

export function CompatibilityChartPage() {
  return (
    <div className="space-y-10">
      {/* Hero */}
      <section className="space-y-4">
        <Badge className="bg-red-600/20 text-red-200 border-red-500/60">
          Compatibility guide
        </Badge>
        <h1 className="text-3xl md:text-4xl font-bold leading-tight">
          Which blood types{" "}
          <span className="bg-gradient-to-r from-red-400 to-blue-400 bg-clip-text text-transparent">
            match safely
          </span>
          ?
        </h1>
        <p className="text-sm md:text-base text-slate-300 max-w-2xl">
          This chart shows which blood groups can donate red blood cells to
          which recipients. Remember that hospitals also consider many other
          medical factors – this is a simplified view for educational purposes.
        </p>

        <div className="flex flex-wrap gap-3">
          <Button
            asChild
            className="bg-slate-900/90 hover:bg-slate-900 text-white border border-white/50"
          >
            <Link to="/register-donor">Become a donor</Link>
          </Button>
          <Button
            asChild
            variant="outline"
            className="border-blue-400 text-blue-300 hover:bg-blue-500/10"
          >
            <Link to="/how-it-works">See how it works</Link>
          </Button>
        </div>
      </section>

      {/* Key facts */}
      <section className="grid gap-4 md:grid-cols-3">
        <Card className="p-4 bg-slate-900/80 border-slate-800">
          <h2 className="text-sm font-semibold mb-1 flex items-center gap-2">
            <Droplet className="h-4 w-4 text-emerald-300" />
            Universal donor
          </h2>
          <p className="text-sm text-slate-300">
            <span className="font-semibold text-emerald-300">O-negative</span>{" "}
            can donate red cells to patients of any blood group.
          </p>
        </Card>
        <Card className="p-4 bg-slate-900/80 border-slate-800">
          <h2 className="text-sm font-semibold mb-1 flex items-center gap-2">
            <Droplet className="h-4 w-4 text-sky-300" />
            Universal recipient
          </h2>
          <p className="text-sm text-slate-300">
            <span className="font-semibold text-sky-300">AB-positive</span> can
            receive red cells from all blood groups.
          </p>
        </Card>
        <Card className="p-4 bg-slate-900/80 border-slate-800">
          <h2 className="text-sm font-semibold mb-1 flex items-center gap-2">
            <Droplet className="h-4 w-4 text-amber-300" />
            Rh factor
          </h2>
          <p className="text-sm text-slate-300">
            In general, negative (−) can donate to negative and positive types,
            but positive (+) should not donate to negative recipients.
          </p>
        </Card>
      </section>

      {/* Compatibility grid */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Red-cell compatibility chart</h2>
        <Card className="p-4 bg-slate-950/80 border-slate-800 overflow-auto">
          <table className="min-w-full text-xs border-separate border-spacing-0">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 bg-slate-950/90 text-left text-[11px] uppercase tracking-wide text-slate-400 px-2 py-2 border-b border-slate-800">
                  Donor ↓ / Recipient →
                </th>
                {BLOOD_TYPES.map((bt) => (
                  <th
                    key={bt}
                    className="text-center text-[11px] uppercase tracking-wide text-slate-300 px-2 py-2 border-b border-slate-800"
                  >
                    {bt}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {BLOOD_TYPES.map((donor) => (
                <tr key={donor}>
                  <td className="sticky left-0 z-10 bg-slate-950/90 text-[11px] font-semibold text-slate-200 px-2 py-1 border-b border-slate-800">
                    {donor}
                  </td>
                  {BLOOD_TYPES.map((recipient) => {
                    const ok = isCompatible(donor, recipient);
                    return (
                      <td
                        key={recipient}
                        className="px-1 py-1 text-center border-b border-slate-800"
                      >
                        <div
                          className={[
                            "h-7 w-10 mx-auto rounded-md flex items-center justify-center text-[11px] font-semibold",
                            ok
                              ? "bg-emerald-500/20 border border-emerald-400/60 text-emerald-100"
                              : "bg-slate-900/60 border border-slate-800 text-slate-500",
                          ].join(" ")}
                        >
                          {ok ? "✓" : ""}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
        <p className="text-[11px] text-slate-400">
          This table focuses on red-cell transfusions only. Plasma and platelet
          compatibility follow different rules and are not covered here.
        </p>
      </section>
    </div>
  );
}
