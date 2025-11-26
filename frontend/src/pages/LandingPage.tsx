import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";

export function LandingPage() {
  return (
    <div className="space-y-16">
      {/* HERO */}
      <section className="grid gap-10 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] items-center">
        <div className="space-y-5">
          

          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold leading-tight">
            A smarter way to manage{" "}
            <span className="bg-gradient-to-r from-red-500 to-blue-400 bg-clip-text text-transparent">
              blood donations
            </span>{" "}
            and requests.
          </h1>

          <p className="text-sm md:text-base text-slate-300 max-w-xl">
            E-BloodBank connects donors, recipients, and administrators with
            live inventory tracking, secure appointments, and clear analytics — so
            the right blood reaches the right patient at the right time.
          </p>

          <div className="flex flex-wrap gap-3">
            <Button
              asChild
              className="bg-red-600 hover:bg-red-700 text-white font-semibold px-6"
            >
              <Link to="/register-donor">Become a Donor</Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="border-blue-400 text-blue-300 hover:bg-blue-500/10 px-6"
            >
              <Link to="/register-recipient">Request Blood</Link>
            </Button>
          </div>

          <div className="flex flex-wrap gap-6 pt-4 text-xs md:text-sm text-slate-400">
            <div>
              <div className="font-semibold text-slate-100">Secure</div>
              <div>Role-based access with JWT authentication.</div>
            </div>
            <div>
              <div className="font-semibold text-slate-100">Transparent</div>
              <div>Inventory &amp; requests tracked in real-time.</div>
            </div>
            <div>
              <div className="font-semibold text-slate-100">Insightful</div>
              <div>Dashboards for admins, donors &amp; recipients.</div>
            </div>
          </div>
        </div>

        <Card className="p-5 bg-slate-900/80 border-slate-800 space-y-4 shadow-lg">
          <h2 className="text-lg font-semibold">
            Live Overview <span className="text-xs text-slate-400">(mock)</span>
          </h2>
          <ul className="space-y-2 text-sm text-slate-300">
            <li>• 120+ registered donors this month</li>
            <li>• 34 active blood requests by urgency</li>
            <li>• Inventory status by blood type and location</li>
            <li>• Donation and dispatch trends for admins</li>
          </ul>
          <p className="text-xs text-slate-500 pt-1">
            In the real dashboard, these will be interactive charts &amp; tables.
          </p>
        </Card>
      </section>

      {/* STATS STRIP */}
      <section className="grid gap-4 md:grid-cols-3 rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-4">
        <div>
          <div className="text-2xl font-semibold text-red-400">3x</div>
          <p className="text-xs text-slate-400">
            Each blood donation can help save up to three lives.
          </p>
        </div>
        <div>
          <div className="text-2xl font-semibold text-blue-400">24/7</div>
          <p className="text-xs text-slate-400">
            Requests can be submitted any time, from any connected hospital.
          </p>
        </div>
        <div>
          <div className="text-2xl font-semibold text-emerald-400">100%</div>
          <p className="text-xs text-slate-400">
            Transparent tracking of each unit from donation to dispatch.
          </p>
        </div>
      </section>

      {/* WHY CHOOSE */}
      <section className="space-y-6">
        <h2 className="text-2xl font-semibold">Why choose E-BloodBank?</h2>
        <div className="grid gap-5 md:grid-cols-3">
          <Card className="p-4 bg-slate-900/70 border-slate-800">
            <h3 className="font-semibold mb-2">For donors</h3>
            <p className="text-sm text-slate-300 mb-3">
              See recommended locations where your blood type is needed most,
              track your eligibility, and earn milestones for frequent donations.
            </p>
          </Card>
          <Card className="p-4 bg-slate-900/70 border-slate-800">
            <h3 className="font-semibold mb-2">For recipients</h3>
            <p className="text-sm text-slate-300 mb-3">
              Submit requests with urgency, view compatible blood types, and
              track every request from submission to completion.
            </p>
          </Card>
          <Card className="p-4 bg-slate-900/70 border-slate-800">
            <h3 className="font-semibold mb-2">For admins</h3>
            <p className="text-sm text-slate-300 mb-3">
              Manage locations, monitor inventory, and analyze donation &amp;
              dispatch trends to prevent shortages.
            </p>
          </Card>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="space-y-6">
        <h2 className="text-2xl font-semibold">How E-BloodBank works</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="p-4 bg-slate-900/70 border-slate-800">
            <div className="text-xs font-semibold text-slate-400 mb-1">
              STEP 1
            </div>
            <h3 className="font-semibold mb-2">Register securely</h3>
            <p className="text-sm text-slate-300">
              Donors and recipients create accounts with verified details and
              saved blood types.
            </p>
          </Card>
          <Card className="p-4 bg-slate-900/70 border-slate-800">
            <div className="text-xs font-semibold text-slate-400 mb-1">
              STEP 2
            </div>
            <h3 className="font-semibold mb-2">
              Book or request with confidence
            </h3>
            <p className="text-sm text-slate-300">
              Donors book appointments, recipients send requests, and admins
              manage stock per location.
            </p>
          </Card>
          <Card className="p-4 bg-slate-900/70 border-slate-800">
            <div className="text-xs font-semibold text-slate-400 mb-1">
              STEP 3
            </div>
            <h3 className="font-semibold mb-2">Track the entire journey</h3>
            <p className="text-sm text-slate-300">
              Every donation and dispatch is tracked, with dashboards for admins,
              donors, and recipients.
            </p>
          </Card>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="rounded-xl border border-slate-800 bg-gradient-to-r from-red-700/80 via-red-600/80 to-blue-700/80 px-6 py-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold mb-1">
            Ready to power your blood bank digitally?
          </h2>
          <p className="text-sm text-slate-100/90 max-w-md">
            Start by registering as a donor or recipient. Admin features can be
            accessed via the dedicated admin sign-in.
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            asChild
            className="bg-slate-900/90 hover:bg-slate-900 text-white border border-white/60"
          >
            <Link to="/login">Sign In</Link>
          </Button>
          <Button
            asChild
            variant="outline"
            className="border-white/70 text-white hover:bg-white/10"
          >
            <Link to="/compatibility-chart">View Compatibility</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
