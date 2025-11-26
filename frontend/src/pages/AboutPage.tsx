// src/pages/AboutPage.tsx
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";

export function AboutPage() {
  return (
    <div className="space-y-10">
      {/* Hero */}
      <section className="grid gap-8 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] items-start">
        <div className="space-y-4">
          <Badge className="bg-red-600/20 text-red-200 border-red-500/60">
            About E-BloodBank
          </Badge>

          <h1 className="text-3xl md:text-4xl font-bold leading-tight">
            Modern, connected{" "}
            <span className="bg-gradient-to-r from-red-400 to-blue-400 bg-clip-text text-transparent">
              blood management
            </span>{" "}
            for hospitals and communities.
          </h1>

          <p className="text-sm md:text-base text-slate-300 max-w-2xl">
            E-BloodBank is built to make blood donation and transfusion more
            organised, transparent and predictable. It connects donors,
            patients, and blood-bank teams in one secure, easy-to-use platform.
          </p>

          <p className="text-sm text-slate-400 max-w-2xl">
            Instead of phone calls, scattered spreadsheets and guesswork,
            E-BloodBank gives you clear appointments, real-time requests and
            inventory visibility across locations — so critical decisions can be
            made quickly and confidently.
          </p>

          <div className="flex flex-wrap gap-3 pt-1">
            <Button
              asChild
              className="bg-red-600 hover:bg-red-700 text-white font-semibold"
            >
              <Link to="/register-donor">Register as a donor</Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="border-blue-400 text-blue-300 hover:bg-blue-500/10"
            >
              <Link to="/register-recipient">Request blood</Link>
            </Button>
          </div>
        </div>

        <Card className="p-5 bg-slate-900/80 border-slate-800 space-y-4 shadow-lg">
          <h2 className="text-sm font-semibold text-slate-100">
            What E-BloodBank helps you do
          </h2>
          <ul className="space-y-2 text-xs text-slate-300">
            <li>• Track donors, recipients and locations in one place.</li>
            <li>• Monitor stock levels for each blood group per branch.</li>
            <li>
              • Prioritise urgent and emergency requests with clear statuses.
            </li>
            <li>
              • Review donation and fulfilment history for quality and planning.
            </li>
          </ul>
          <p className="text-[11px] text-slate-500">
            Designed to fit into existing workflows, while adding the clarity
            and traceability that modern healthcare deserves.
          </p>
        </Card>
      </section>

      {/* Mission / Vision / Values */}
      <section className="grid gap-4 md:grid-cols-3">
        <Card className="p-4 bg-slate-900/75 border-slate-800">
          <h3 className="text-sm font-semibold mb-2">Our mission</h3>
          <p className="text-sm text-slate-300">
            Make sure that every patient who needs blood can get it in time,
            with a clear trail from donation to transfusion.
          </p>
        </Card>

        <Card className="p-4 bg-slate-900/75 border-slate-800">
          <h3 className="text-sm font-semibold mb-2">Our vision</h3>
          <p className="text-sm text-slate-300">
            A connected network of blood banks where availability, urgency and
            demand are visible at a glance — not hidden in paper files and phone
            calls.
          </p>
        </Card>

        <Card className="p-4 bg-slate-900/75 border-slate-800">
          <h3 className="text-sm font-semibold mb-2">Our values</h3>
          <ul className="text-sm text-slate-300 space-y-1">
            <li>• Put patient safety and donor welfare first.</li>
            <li>• Respect people’s time with clear, simple flows.</li>
            <li>• Keep information organised, accurate and auditable.</li>
          </ul>
        </Card>
      </section>

      {/* Who uses it */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Who E-BloodBank serves</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="p-4 bg-slate-900/80 border-slate-800">
            <h3 className="text-sm font-semibold mb-1">Voluntary donors</h3>
            <p className="text-sm text-slate-300">
              Donors can see when they are eligible, book appointments, view
              past donations and feel confident their contribution is tracked
              and valued.
            </p>
          </Card>
          <Card className="p-4 bg-slate-900/80 border-slate-800">
            <h3 className="text-sm font-semibold mb-1">
              Patients &amp; families
            </h3>
            <p className="text-sm text-slate-300">
              Recipients can submit structured requests, understand compatibility
              and follow the status from pending to fulfilled, instead of being
              left in the dark.
            </p>
          </Card>
          <Card className="p-4 bg-slate-900/80 border-slate-800">
            <h3 className="text-sm font-semibold mb-1">
              Hospitals &amp; blood banks
            </h3>
            <p className="text-sm text-slate-300">
              Staff can see stock per location, incoming donations, active
              requests and historical records — all in one dashboard, instead of
              scattered tools.
            </p>
          </Card>
        </div>
      </section>

      {/* How we operate / trust section */}
      <section className="rounded-xl border border-slate-800 bg-slate-900/70 p-5 space-y-3">
        <h2 className="text-sm font-semibold uppercase text-slate-300">
          How E-BloodBank supports your organisation
        </h2>
        <div className="grid gap-3 md:grid-cols-3 text-xs text-slate-300">
          <div>
            <div className="font-semibold mb-1">Operational clarity</div>
            <p>
              Appointments, requests, statuses and locations are structured and
              easy to review, so teams waste less time searching for answers.
            </p>
          </div>
          <div>
            <div className="font-semibold mb-1">Responsible tracking</div>
            <p>
              Every donation and request leaves a clear record, helping you
              review trends, identify gaps and improve planning over time.
            </p>
          </div>
          <div>
            <div className="font-semibold mb-1">Patient-centred design</div>
            <p>
              The system is built around timely decisions: who needs blood, what
              type is required, where it is available, and how quickly it can be
              arranged.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
