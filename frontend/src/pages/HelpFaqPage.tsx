// src/pages/HelpFaqPage.tsx
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export function HelpFaqPage() {
  return (
    <div className="space-y-10">
      {/* Hero */}
      <section className="space-y-4">
        <h1 className="text-3xl md:text-4xl font-bold leading-tight">
          Help &amp; FAQs
        </h1>
        <p className="text-sm md:text-base text-slate-300 max-w-2xl">
          Find quick answers about using E-BloodBank as a donor, recipient or
          administrator. If something still isn’t clear, your hospital or blood
          bank staff can guide you through the process.
        </p>

        <div className="flex flex-wrap gap-3 pt-2">
          <Button
            asChild
            className="bg-red-600 hover:bg-red-700 text-white text-sm"
          >
            <Link to="/register-donor">Register as a donor</Link>
          </Button>
          <Button
            asChild
            variant="outline"
            className="border-blue-400 text-blue-300 hover:bg-blue-500/10 text-sm"
          >
            <Link to="/register-recipient">Request blood</Link>
          </Button>
          <Button
            asChild
            variant="outline"
            className="border-slate-600 text-slate-200 hover:bg-slate-800/70 text-sm"
          >
            <Link to="/compatibility-chart">View compatibility chart</Link>
          </Button>
        </div>
      </section>

      {/* FAQ grid */}
      <section className="grid gap-6 md:grid-cols-2">
        {/* General */}
        <Card className="p-4 bg-slate-900/80 border-slate-800 space-y-3">
          <h2 className="text-sm font-semibold uppercase text-slate-200">
            General questions
          </h2>

          <div className="space-y-3 text-sm text-slate-300">
            <div>
              <p className="font-semibold text-slate-100">
                Who can use E-BloodBank?
              </p>
              <p className="text-slate-300 text-xs mt-1">
                Registered donors, patients / attendants, and authorised blood
                bank or hospital staff. Each group has its own secure login and
                features.
              </p>
            </div>

            <div>
              <p className="font-semibold text-slate-100">
                Is this a replacement for my hospital&apos;s system?
              </p>
              <p className="text-slate-300 text-xs mt-1">
                E-BloodBank is designed to support existing workflows — making
                it easier to track donors, requests and inventory — not to
                replace clinical or lab systems.
              </p>
            </div>

            <div>
              <p className="font-semibold text-slate-100">
                Do I have to pay to use it as a donor or recipient?
              </p>
              <p className="text-slate-300 text-xs mt-1">
                No. Donor and recipient access is free. Any deployment or
                integration decisions are handled by your hospital or health
                authority.
              </p>
            </div>
          </div>
        </Card>

        {/* Donors */}
        <Card className="p-4 bg-slate-900/80 border-slate-800 space-y-3">
          <h2 className="text-sm font-semibold uppercase text-slate-200">
            For donors
          </h2>

          <div className="space-y-3 text-sm text-slate-300">
            <div>
              <p className="font-semibold text-slate-100">
                How do I know if I&apos;m eligible to donate?
              </p>
              <p className="text-slate-300 text-xs mt-1">
                After you sign in as a donor, your dashboard shows your basic
                eligibility and the earliest date you can donate again, based on
                your age, weight and last recorded donation.
              </p>
            </div>

            <div>
              <p className="font-semibold text-slate-100">
                Can I choose where to donate?
              </p>
              <p className="text-slate-300 text-xs mt-1">
                Yes. On the &quot;Donate Blood&quot; page you can select a blood
                bank location, date and time slot. Some locations may be
                highlighted where your blood group is especially needed.
              </p>
            </div>

            <div>
              <p className="font-semibold text-slate-100">
                What if I need to cancel my appointment?
              </p>
              <p className="text-slate-300 text-xs mt-1">
                You can cancel directly from the donor dashboard or the
                &quot;Donate Blood&quot; page as long as the appointment is
                still in &quot;Scheduled&quot; status.
              </p>
            </div>
          </div>
        </Card>

        {/* Recipients */}
        <Card className="p-4 bg-slate-900/80 border-slate-800 space-y-3">
          <h2 className="text-sm font-semibold uppercase text-slate-200">
            For recipients &amp; attendants
          </h2>

          <div className="space-y-3 text-sm text-slate-300">
            <div>
              <p className="font-semibold text-slate-100">
                How do I request blood for a patient?
              </p>
              <p className="text-slate-300 text-xs mt-1">
                After registering as a recipient, use the &quot;Request
                Blood&quot; page to enter blood group, units needed, urgency and
                location. Your request is then reviewed by the admin team.
              </p>
            </div>

            <div>
              <p className="font-semibold text-slate-100">
                What do the request statuses mean?
              </p>
              <p className="text-slate-300 text-xs mt-1">
                <span className="font-semibold">Pending</span> means waiting for
                review, <span className="font-semibold">Approved</span> means
                the request has been accepted,{" "}
                <span className="font-semibold">Fulfilled</span> means it has
                been completed, and{" "}
                <span className="font-semibold">Rejected</span> means it could
                not be processed.
              </p>
            </div>

            <div>
              <p className="font-semibold text-slate-100">
                What is an emergency request?
              </p>
              <p className="text-slate-300 text-xs mt-1">
                Emergency requests are flagged when blood is needed urgently.
                These appear more prominently to admins so they can prioritise
                them when managing stock and donors.
              </p>
            </div>
          </div>
        </Card>

        {/* Admin / technical */}
        <Card className="p-4 bg-slate-900/80 border-slate-800 space-y-3">
          <h2 className="text-sm font-semibold uppercase text-slate-200">
            For admins &amp; coordinators
          </h2>

          <div className="space-y-3 text-sm text-slate-300">
            <div>
              <p className="font-semibold text-slate-100">
                What can the admin dashboard show?
              </p>
              <p className="text-slate-300 text-xs mt-1">
                The admin view includes donor and recipient counts, active
                requests, emergency cases, inventory per location and donation
                history, plus basic reports and charts.
              </p>
            </div>

            <div>
              <p className="font-semibold text-slate-100">
                Who can access the admin panel?
              </p>
              <p className="text-slate-300 text-xs mt-1">
                Only authorised staff with an admin login. In most deployments,
                there is a single admin user or a very small group managed by
                the organisation.
              </p>
            </div>

            <div>
              <p className="font-semibold text-slate-100">
                What if data looks incorrect?
              </p>
              <p className="text-slate-300 text-xs mt-1">
                Appointment dates, statuses and stock levels are controlled by
                your team. If something needs correction, an admin should adjust
                the underlying records according to local policy.
              </p>
            </div>
          </div>
        </Card>
      </section>

      {/* Final nudge */}
      <section className="rounded-xl border border-slate-800 bg-slate-900/70 px-5 py-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold mb-1">
            Still have questions?
          </h2>
          <p className="text-xs text-slate-300 max-w-lg">
            For any medical or operational questions, please speak with your
            hospital or blood bank team. They can confirm policies, eligibility
            checks and how E-BloodBank is being used at your location.
          </p>
        </div>
        <Button
          asChild
          variant="outline"
          className="border-slate-600 text-slate-100 hover:bg-slate-800/70 text-xs"
        >
          <Link to="/compatibility-chart">Check blood compatibility</Link>
        </Button>
      </section>
    </div>
  );
}
