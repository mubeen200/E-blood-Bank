import { Routes, Route, Navigate } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { LandingPage } from "@/pages/LandingPage";
import { LoginPage } from "@/pages/auth/LoginPage";
import { RegisterDonorPage } from "@/pages/auth/RegisterDonorPage";
import { RegisterRecipientPage } from "@/pages/auth/RegisterRecipientPage";
import { DonorDashboard } from "@/pages/Donor/DonorDashboard";
import { DonateBloodPage } from "@/pages/Donor/DonateBloodPage";
import { MyDonationsPage } from "@/pages/Donor/MyDonationsPage";
import { DonorProfilePage } from "@/pages/Donor/DonorProfilePage";

import { EligibilityCheckerPage } from "@/pages/Donor/EligibilityCheckerPage";

import { useAuth } from "@/context/AuthContext";
import type { ReactNode } from "react";

type Role = "DONOR" | "RECIPIENT" | "ADMIN";

function ProtectedRoute({
  children,
  allowedRole,
}: {
  children: ReactNode;
  allowedRole: Role;
}) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
        <div className="text-sm text-slate-200">Checking session…</div>
      </div>
    );
  }

  if (!user || user.role !== allowedRole) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function App() {
  return (
    <MainLayout>
      <Routes>
        {/* Public pages */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register-donor" element={<RegisterDonorPage />} />
        <Route
          path="/register-recipient"
          element={<RegisterRecipientPage />}
        />

        {/* Donor area */}
        
<Route
  path="/donor"
  element={
    <ProtectedRoute allowedRole="DONOR">
      <DonorDashboard />
    </ProtectedRoute>
  }
/>

<Route
  path="/donor/donate"
  element={
    <ProtectedRoute allowedRole="DONOR">
      <DonateBloodPage />
    </ProtectedRoute>
  }
/>

<Route
  path="/donor/history"
  element={
    <ProtectedRoute allowedRole="DONOR">
      <MyDonationsPage />
    </ProtectedRoute>
  }
/>

<Route
  path="/donor/eligibility"
  element={
    <ProtectedRoute allowedRole="DONOR">
      <EligibilityCheckerPage />
    </ProtectedRoute>
  }
/>

<Route
  path="/donor/profile"
  element={
    <ProtectedRoute allowedRole="DONOR">
      <DonorProfilePage />
    </ProtectedRoute>
  }
/>



        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </MainLayout>
  );
}

export default App;
