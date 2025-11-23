import { FormEvent, useState, ChangeEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import api from "@/api/axiosClient";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const GENDERS = ["Male", "Female", "Other"];

export function RegisterRecipientPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    gender: "",
    cnic: "",
    bloodType: "",
    password: "",
    confirmPassword: "",
  });

  const [submitting, setSubmitting] = useState(false);

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!form.name || !form.email || !form.password || !form.bloodType) {
      toast.error("Please fill in all required fields.");
      return;
    }

    if (form.password.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }

    if (form.password !== form.confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    try {
      setSubmitting(true);

      const payload = {
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        phone: form.phone.trim() || undefined,
        gender: form.gender || undefined,
        cnic: form.cnic.trim() || undefined,
        bloodType: form.bloodType,
      };

      const res = await api.post("/auth/register-recipient", payload);

      if (res.data?.user) {
        // ✅ store user in context
        login(res.data.user);

        toast.success("Recipient account created. Welcome to E-BloodBank!");

        // ✅ go straight to recipient dashboard
        navigate("/recipient", { replace: true });
      } else {
        toast.error("Unexpected response from server.");
      }
    } catch (err: any) {
      console.error("register recipient error", err);
      const msg =
        err?.response?.data?.message ||
        "Registration failed. Please check your details and try again.";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex justify-center">
      <Card className="w-full max-w-3xl bg-slate-900/90 border-slate-700 text-white shadow-2xl">
        <div className="px-6 py-5 border-b border-slate-800">
          <h1 className="text-2xl font-semibold">Request Blood – Sign Up</h1>
          <p className="text-sm text-slate-300 mt-1">
            Create your recipient account to request blood units, track request
            status, and get alerts when blood is available.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-6 space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Full Name */}
            <div className="space-y-1">
              <Label htmlFor="name">
                Full Name <span className="text-red-400">*</span>
              </Label>
              <Input
                id="name"
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="e.g., Ali Raza"
                className="bg-slate-950 border-slate-700 text-sm"
              />
            </div>

            {/* Blood type */}
            <div className="space-y-1">
              <Label>
                Blood Type <span className="text-red-400">*</span>
              </Label>
              <Select
                value={form.bloodType}
                onValueChange={(val: string) =>
                  setForm((prev) => ({ ...prev, bloodType: val }))
                }
              >
                <SelectTrigger className="bg-slate-950 border-slate-700 text-sm">
                  <SelectValue placeholder="Select blood type" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-700">
                  {BLOOD_TYPES.map((bt) => (
                    <SelectItem key={bt} value={bt}>
                      {bt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Email */}
            <div className="space-y-1">
              <Label htmlFor="email">
                Email <span className="text-red-400">*</span>
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                placeholder="you@example.com"
                className="bg-slate-950 border-slate-700 text-sm"
              />
            </div>

            {/* Phone */}
            <div className="space-y-1">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                name="phone"
                value={form.phone}
                onChange={handleChange}
                placeholder="03xx-xxxxxxx"
                className="bg-slate-950 border-slate-700 text-sm"
              />
            </div>

            {/* Gender */}
            <div className="space-y-1">
              <Label>Gender</Label>
              <Select
                value={form.gender}
                onValueChange={(val: string) =>
                  setForm((prev) => ({ ...prev, gender: val }))
                }
              >
                <SelectTrigger className="bg-slate-950 border-slate-700 text-sm">
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-700">
                  {GENDERS.map((g) => (
                    <SelectItem key={g} value={g}>
                      {g}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* CNIC */}
            <div className="space-y-1">
              <Label htmlFor="cnic">CNIC</Label>
              <Input
                id="cnic"
                name="cnic"
                value={form.cnic}
                onChange={handleChange}
                placeholder="e.g., 42201-1234567-1"
                className="bg-slate-950 border-slate-700 text-sm"
              />
            </div>

            {/* Password */}
            <div className="space-y-1">
              <Label htmlFor="password">
                Password <span className="text-red-400">*</span>
              </Label>
              <Input
                id="password"
                name="password"
                type="password"
                value={form.password}
                onChange={handleChange}
                className="bg-slate-950 border-slate-700 text-sm"
              />
            </div>

            {/* Confirm password */}
            <div className="space-y-1">
              <Label htmlFor="confirmPassword">
                Confirm Password <span className="text-red-400">*</span>
              </Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                value={form.confirmPassword}
                onChange={handleChange}
                className="bg-slate-950 border-slate-700 text-sm"
              />
            </div>
          </div>

          {/* Submit */}
          <div className="pt-2 flex flex-col gap-3">
            <Button
              type="submit"
              disabled={submitting}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white"
            >
              {submitting ? "Creating account..." : "Create Recipient Account"}
            </Button>

            <p className="text-xs text-slate-300 text-center">
              Already have an account?{" "}
              <Link
                to="/login"
                className="text-blue-300 hover:text-blue-200 underline"
              >
                Sign in
              </Link>
            </p>
          </div>
        </form>
      </Card>
    </div>
  );
}
