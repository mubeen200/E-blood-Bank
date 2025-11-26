// src/pages/HowItWorksPage.tsx
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import {
  CalendarDays,
  ClipboardList,
  Droplet,
  ShieldCheck,
  Activity,
} from "lucide-react";

export function HowItWorksPage() {
  return (
    <div className="space-y-10">
      {/* Hero */}
      <section className="space-y-4">
        <Badge className="bg-blue-600/20 text-blue-200 border-blue-500/60">
          How it works
        </Badge>
        <h1 className="text-3xl md:text-4xl font-bold leading-tight">
          From donor to recipient in{" "}
          <span className="bg-gradient-to-r from-red-400 to-blue-400 bg-clip-text text-transparent">
            three clear flows
          </span>
          .
        </h1>
        <p className="text-sm md:text-base text-slate-300 max-w-2xl">
          E-BloodBank mirrors what happens in a real blood bank but makes it
          visible and trackable: donors schedule donations, recipients raise
          requests, admins manage the inventory and approvals in between.
        </p>

        <div className="flex flex-wrap gap-3">
          <Button asChild className="bg-red-600 hover:bg-red-700 text-white">
            <Link to="/register-donor">Try donor flow</Link>
          </Button>
          <Button
            asChild
            variant="outline"
            className="border-blue-400 text-blue-300 hover:bg-blue-500/10"
          >
            <Link to="/register-recipient">Try recipient flow</Link>
          </Button>
        </div>
      </section>

      {/* Donor / Recipient flows */}
      <section className="grid gap-6 lg:grid-cols-2">
        {/* Donor side */}
        <Card className="p-5 bg-slate-900/80 border-slate-800 space-y-3">
          <div className="flex items-center gap-2 mb-2">
            <Droplet className="h-5 w-5 text-red-300" />
            <h2 className="text-sm font-semibold uppercase">
              Donor journey
            </h2>
          </div>
          <ol className="space-y-3 text-sm text-slate-300">
            <li>
              <span className="font-semibold text-slate-100">1. Setup:</span>{" "}
              Donor registers, fills basic health info and is assigned a blood
              type.
            </li>
            <li>
              <span className="font-semibold text-slate-100">2. Check:</span>{" "}
              Eligibility engine calculates the next allowed donation date and
              shows reasons if they’re not ready yet.
            </li>
            <li>
              <span className="font-semibold text-slate-100">
                3. Book appointment:
              </span>{" "}
              Donor selects a blood bank, date and time slot. The appointment
              appears on their dashboard and in admin’s view.
            </li>
            <li>
              <span className="font-semibold text-slate-100">
                4. After donation:
              </span>{" "}
              Admin marks the appointment as completed, which increases the
              donor’s statistics and updates the inventory.
            </li>
          </ol>
        </Card>

        {/* Recipient side */}
        <Card className="p-5 bg-slate-900/80 border-slate-800 space-y-3">
          <div className="flex items-center gap-2 mb-2">
            <ClipboardList className="h-5 w-5 text-amber-300" />
            <h2 className="text-sm font-semibold uppercase">
              Recipient journey
            </h2>
          </div>
          <ol className="space-y-3 text-sm text-slate-300">
            <li>
              <span className="font-semibold text-slate-100">1. Request:</span>{" "}
              Recipient fills a form with units, blood type, urgency and target
              location.
            </li>
            <li>
              <span className="font-semibold text-slate-100">
                2. Compatibility:
              </span>{" "}
              The compatibility chart guides which blood types can fulfill the
              request.
            </li>
            <li>
              <span className="font-semibold text-slate-100">
                3. Admin decision:
              </span>{" "}
              Admin reviews and sets the status to{" "}
              <span className="text-emerald-300">APPROVED</span> or{" "}
              <span className="text-red-300">REJECTED</span>.
            </li>
            <li>
              <span className="font-semibold text-slate-100">
                4. Fulfilment:
              </span>{" "}
              Once blood is actually handed over, the admin marks it
              <span className="text-emerald-300"> FULFILLED</span>, which
              decreases the inventory at that location.
            </li>
          </ol>
        </Card>
      </section>

      {/* Admin / inventory view */}
      <section className="grid gap-4 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Card className="p-5 bg-slate-900/85 border-slate-800 space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <Activity className="h-5 w-5 text-sky-300" />
            <h2 className="text-sm font-semibold uppercase">
              Admin &amp; inventory flow
            </h2>
          </div>
          <p className="text-sm text-slate-300">
            Admins are the control center. They see dashboards, manage donors,
            recipients, and track stock per location:
          </p>
          <ul className="list-disc pl-5 text-sm text-slate-300 space-y-1">
            <li>Monitor all active requests and emergencies.</li>
            <li>
              View real-time inventory by blood type at each blood-bank branch.
            </li>
            <li>Confirm completed donations to increase supply.</li>
            <li>Mark fulfilled requests, which decreases the matching stock.</li>
          </ul>
        </Card>

        <Card className="p-5 bg-slate-900/85 border-slate-800 space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck className="h-5 w-5 text-emerald-300" />
            <h2 className="text-sm font-semibold uppercase">
              Safety checks
            </h2>
          </div>
          <p className="text-xs text-slate-300">
            The system includes basic safeguards:
          </p>
          <ul className="text-xs text-slate-300 space-y-1 list-disc pl-5">
            <li>Eligibility rules based on age, weight and donation spacing.</li>
            <li>No negative inventory: stock never drops below zero.</li>
            <li>
              Requests can’t be modified once rejected, cancelled or fulfilled.
            </li>
          </ul>
        </Card>
      </section>
    </div>
  );
}
