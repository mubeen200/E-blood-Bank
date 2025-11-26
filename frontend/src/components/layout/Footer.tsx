import { Link } from "react-router-dom";

export function Footer() {
  return (
    <footer className="border-t border-slate-800 bg-slate-950/95">
      <div className="mx-auto max-w-6xl px-4 py-6 grid gap-6 md:grid-cols-4 text-sm">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <img
              src="/logo.png"
              alt="E-BloodBank"
              className="h-7 w-7 rounded-full border border-slate-700 bg-white object-contain"
            />
            <span className="font-semibold">E-BloodBank</span>
          </div>
          <p className="text-slate-400">
            A secure, data-driven way to connect donors, recipients, and blood
            banks.
          </p>
        </div>

        <div>
          <h3 className="font-semibold mb-2">Platform</h3>
          <ul className="space-y-1 text-slate-400">
            <li>
              <Link to="/about" className="hover:text-slate-200">
                About us
              </Link>
            </li>
            <li>
              <Link to="/how-it-works" className="hover:text-slate-200">
                How it works
              </Link>
            </li>
            <li>
              <Link to="/compatibility-chart" className="hover:text-slate-200">
                Compatibility chart
              </Link>
            </li>
            <li>
              <Link to="/register-donor" className="hover:text-slate-200">
                Become a donor
              </Link>
            </li>
            <li>
              <Link to="/register-recipient" className="hover:text-slate-200">
                Request blood
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="font-semibold mb-2">Support</h3>
          <ul className="space-y-1 text-slate-400">
            <li>
              <Link to="/help" className="hover:text-slate-200">
                Help &amp; FAQs
              </Link>
            </li>
            <li>Safety guidelines</li>
            <li>Privacy &amp; data protection</li>
          </ul>
        </div>

        <div>
          <h3 className="font-semibold mb-2">Contact</h3>
          <p className="text-slate-400">
            For partnership or deployment enquiries, reach out to your local
            health authority or hospital IT team.
          </p>
        </div>
      </div>
      <div className="border-t border-slate-800 py-3 text-center text-xs text-slate-500">
        © {new Date().getFullYear()} E-BloodBank.
      </div>
    </footer>
  );
}
