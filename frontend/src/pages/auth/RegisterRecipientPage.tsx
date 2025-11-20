import { FormEvent, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "@/api/axiosClient";
import { useAuth } from "@/context/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const bloodTypes = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const genders = ["Male", "Female", "Other"];

export function RegisterRecipientPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [phone, setPhone] = useState("");
  const [gender, setGender] = useState("");
  const [cnic, setCnic] = useState("");
  const [bloodType, setBloodType] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (!name || !email || !password || !bloodType) {
      setError("Please fill in all required fields (*).");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        name,
        email,
        password,
        phone,
        gender,
        cnic,
        bloodType,
      };

      const res = await api.post("/auth/register-recipient", payload);
      const user = res.data.user;

      login(user);
      // we don't have recipient dashboard yet, so send home for now
      navigate("/");
    } catch (err: any) {
      console.error(err);
      setError(
        err?.response?.data?.message ||
          "Registration failed. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex items-center justify-center">
      <Card className="w-full max-w-3xl bg-slate-900/90 border-slate-800 text-white shadow-xl p-6 md:p-8 space-y-6">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold">Request Blood</h1>
          <p className="text-xs text-slate-300">
            Create a recipient account so you can place requests, track their
            status, and see compatible donors and locations.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
          {/* Left column */}
          <div className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="name">
                Full Name <span className="text-red-400">*</span>
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-slate-950 border-slate-700 text-white"
                required
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="email">
                Email <span className="text-red-400">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-slate-950 border-slate-700 text-white"
                required
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="bg-slate-950 border-slate-700 text-white"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="gender">Gender</Label>
              <select
                id="gender"
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
              >
                <option value="">Select gender</option>
                {genders.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="cnic">CNIC</Label>
              <Input
                id="cnic"
                value={cnic}
                onChange={(e) => setCnic(e.target.value)}
                className="bg-slate-950 border-slate-700 text-white"
              />
            </div>
          </div>

          {/* Right column */}
          <div className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="bloodType">
                Blood Type <span className="text-red-400">*</span>
              </Label>
              <select
                id="bloodType"
                value={bloodType}
                onChange={(e) => setBloodType(e.target.value)}
                className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
                required
              >
                <option value="">Select blood type</option>
                {bloodTypes.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="password">
                Password <span className="text-red-400">*</span>
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-slate-950 border-slate-700 text-white"
                required
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="confirmPassword">
                Confirm Password <span className="text-red-400">*</span>
              </Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="bg-slate-950 border-slate-700 text-white"
                required
              />
            </div>
          </div>

          {/* Error + actions */}
          <div className="md:col-span-2 space-y-3">
            {error && (
              <p className="text-sm text-red-400 bg-red-950/40 border border-red-700/60 rounded px-3 py-2">
                {error}
              </p>
            )}

            <Button
              type="submit"
              disabled={submitting}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold"
            >
              {submitting ? "Creating account..." : "Create Recipient Account"}
            </Button>

            <p className="text-[11px] text-center text-slate-300">
              Already have an account?{" "}
              <Link to="/login" className="underline text-slate-100">
                Sign in
              </Link>
            </p>
          </div>
        </form>
      </Card>
    </div>
  );
}
