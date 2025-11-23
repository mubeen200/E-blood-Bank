import { useEffect, useState, FormEvent } from "react";
import api from "@/api/axiosClient";
import { RecipientSidebar } from "@/components/layout/RecipientSidebar";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { User, Lock } from "lucide-react";

export function RecipientProfilePage() {
  const { user, login } = useAuth();

  // Personal info
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [gender, setGender] = useState("");
  const [cnic, setCnic] = useState("");
  const [bloodType, setBloodType] = useState("");

  // Password change
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loadingProfile, setLoadingProfile] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  // Load profile from API (fresh data)
  useEffect(() => {
    const load = async () => {
      try {
        setLoadingProfile(true);
        const res = await api.get("/recipient/profile");
        const u = res.data?.user || user;

        if (u) {
          setName(u.name || "");
          setEmail(u.email || "");
          setPhone(u.phone || "");
          setGender(u.gender || "");
          setCnic(u.cnic || "");
          setBloodType(u.bloodType || "");

          // refresh auth context user with full data
          login(u);
        }
      } catch (err: any) {
        console.error("Load recipient profile error:", err);
        toast.error(
          err?.response?.data?.message ||
            "Failed to load profile. Please try again."
        );
      } finally {
        setLoadingProfile(false);
      }
    };

    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleProfileSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);

    try {
      const payload: any = {
        name,
        phone,
        gender,
        cnic,
        // bloodType: bloodType, // keep locked for now
      };

      const res = await api.put("/recipient/profile", payload);
      const updated = res.data?.user;

      if (updated) {
        login(updated);
      }

      toast.success("Profile updated successfully.");
    } catch (err: any) {
      console.error("Update recipient profile error:", err);
      toast.error(
        err?.response?.data?.message ||
          "Failed to update profile. Please try again."
      );
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!currentPassword || !newPassword) {
      toast.error("Please fill in all password fields.");
      return;
    }

    if (newPassword.length < 8) {
      toast.error("New password must be at least 8 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("New password and confirmation do not match.");
      return;
    }

    setSavingPassword(true);

    try {
      await api.put("/recipient/change-password", {
        currentPassword,
        newPassword,
      });

      toast.success("Password updated successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      console.error("Change recipient password error:", err);
      toast.error(
        err?.response?.data?.message ||
          "Failed to change password. Please try again."
      );
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="flex gap-6">
      <div className="w-full lg:w-72 shrink-0">
        <RecipientSidebar active="profile" />
      </div>

      <div className="flex-1 space-y-6">
        {/* Header */}
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <User className="h-6 w-6 text-red-400" />
            Profile
          </h1>
          <p className="text-sm text-slate-300">
            Update your personal details and manage your account security.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          {/* Personal info */}
          <Card className="p-5 bg-slate-900/90 border-slate-700 text-white">
            <form onSubmit={handleProfileSubmit} className="space-y-4">
              <div className="flex items-center justify-between mb-1">
                <div>
                  <div className="text-xs font-semibold uppercase">
                    Personal information
                  </div>
                  <p className="text-[11px] text-slate-300">
                    Keep your contact details and blood type accurate.
                  </p>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="name">Full name</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="bg-slate-950 border-slate-700 text-white"
                    disabled={loadingProfile}
                    required
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="email">Email (login)</Label>
                  <Input
                    id="email"
                    value={email}
                    disabled
                    className="bg-slate-950 border-slate-700/70 text-slate-300 cursor-not-allowed"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="bg-slate-950 border-slate-700 text-white"
                    disabled={loadingProfile}
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="gender">Gender</Label>
                  <select
                    id="gender"
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    disabled={loadingProfile}
                    className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-red-500"
                  >
                    <option value="">Select gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="cnic">CNIC</Label>
                  <Input
                    id="cnic"
                    value={cnic}
                    onChange={(e) => setCnic(e.target.value)}
                    className="bg-slate-950 border-slate-700 text-white"
                    disabled={loadingProfile}
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="bloodType">Blood type</Label>
                  <select
                    id="bloodType"
                    value={bloodType}
                    onChange={(e) => setBloodType(e.target.value)}
                    disabled // locked for now
                    className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-300 cursor-not-allowed"
                  >
                    <option value="">{bloodType || "Not set"}</option>
                  </select>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    If this is wrong, please contact the blood bank to correct
                    it.
                  </p>
                </div>
              </div>

              <div className="pt-1">
                <Button
                  type="submit"
                  disabled={savingProfile || loadingProfile}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  {savingProfile ? "Saving..." : "Save changes"}
                </Button>
              </div>
            </form>
          </Card>

          {/* Password / security */}
          <Card className="p-5 bg-slate-900/90 border-slate-700 text-white">
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <Lock className="h-4 w-4 text-red-300" />
                  <div className="text-xs font-semibold uppercase">
                    Security
                  </div>
                </div>
                <span className="text-[10px] text-slate-400">
                  Use a strong, unique password.
                </span>
              </div>

              <div className="space-y-1">
                <Label htmlFor="currentPassword">Current password</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="bg-slate-950 border-slate-700 text-white"
                  autoComplete="current-password"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="newPassword">New password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="bg-slate-950 border-slate-700 text-white"
                  autoComplete="new-password"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="confirmPassword">
                  Confirm new password
                </Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="bg-slate-950 border-slate-700 text-white"
                  autoComplete="new-password"
                />
              </div>

              <div className="pt-1">
                <Button
                  type="submit"
                  disabled={savingPassword}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {savingPassword ? "Updating..." : "Update password"}
                </Button>
              </div>

              <p className="text-[10px] text-slate-400 mt-1">
                Changing your password only affects this E-BloodBank account.
              </p>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}
