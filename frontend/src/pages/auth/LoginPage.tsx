import { FormEvent, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import api from "@/api/axiosClient";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

type RoleOption = "DONOR" | "RECIPIENT" | "ADMIN";

export function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<RoleOption>("DONOR");
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const res = await api.post("/auth/login", { email, password, role });
      const user = res.data.user;
      login(user);

      if (user.role === "ADMIN") navigate("/admin");
      else if (user.role === "DONOR") navigate("/donor");
      else if (user.role === "RECIPIENT") navigate("/recipient");
      else navigate("/");
    } catch (err: any) {
      setError(err?.response?.data?.message || "Login failed");
    }
  };

  return (
    <div className="flex items-center justify-center">
      <Card className="w-full max-w-md space-y-5 p-6 bg-slate-900/90 border-slate-800 shadow-xl text-white">
        <div className="text-center space-y-1">
          <h2 className="text-xl font-semibold">Sign in to E-BloodBank</h2>
          <p className="text-xs text-slate-300">
            Select your role so we route you to the correct dashboard.
          </p>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          {/* Role selector */}
          <div className="space-y-2">
            <Label>I am a</Label>
            <div className="grid grid-cols-3 gap-2 text-xs">
              {[
                { value: "DONOR", label: "Donor" },
                { value: "RECIPIENT", label: "Recipient" },
                { value: "ADMIN", label: "Admin" },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setRole(opt.value as RoleOption)}
                  className={[
                    "rounded-md border px-2 py-1.5",
                    role === opt.value
                      ? "border-blue-300 bg-blue-600/70 text-white"
                      : "border-slate-600 bg-slate-900 text-slate-200 hover:bg-slate-800",
                  ].join(" ")}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-slate-950 border-slate-700 text-white"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-slate-950 border-slate-700 text-white"
            />
          </div>

          {error && (
            <p className="text-sm text-red-400 bg-red-950/40 border border-red-700/60 rounded px-2 py-1">
              {error}
            </p>
          )}

          <Button
            type="submit"
            className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold"
          >
            Sign In
          </Button>

          <p className="text-[11px] text-center text-slate-300 pt-1">
            Don’t have an account yet?{" "}
            <span className="text-slate-100">
              Use “Become a Donor” or “Request Blood” from the homepage.
            </span>
          </p>
        </form>
      </Card>
    </div>
  );
}
