import type { ReactNode } from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import { MainLayout } from "@/components/layout/MainLayout";
import { LandingPage } from "@/pages/LandingPage";
import { LoginPage } from "@/pages/auth/LoginPage";
import { RegisterDonorPage } from "@/pages/auth/RegisterDonorPage";
import { RegisterRecipientPage } from "@/pages/auth/RegisterRecipientPage";

import { AboutPage } from "@/pages/AboutPage";
import { HowItWorksPage } from "@/pages/HowItWorksPage";
import { CompatibilityChartPage } from "@/pages/CompatibilityChartPage";
import { HelpFaqPage } from "@/pages/HelpFaqPage";


import { DonorDashboard } from "@/pages/Donor/DonorDashboard";
import { DonateBloodPage } from "@/pages/Donor/DonateBloodPage";
import { MyDonationsPage } from "@/pages/Donor/MyDonationsPage";
import { EligibilityCheckerPage } from "@/pages/Donor/EligibilityCheckerPage";
import { DonorProfilePage } from "@/pages/Donor/DonorProfilePage";
import { DonorNotificationsPage } from "@/pages/Donor/DonorNotificationsPage";

import { RecipientDashboard } from "@/pages/Recipient/RecipientDashboard";
import { RequestBloodPage } from "@/pages/Recipient/RequestBloodPage";
import { RecipientMyRequestsPage } from "@/pages/Recipient/RecipientMyRequestsPage";
import { RecipientEmergencyRequestsPage } from "@/pages/Recipient/RecipientEmergencyRequestsPage";
import { RecipientProfilePage } from "@/pages/Recipient/RecipientProfilePage";
import { RecipientNotificationsPage } from "@/pages/Recipient/RecipientNotificationsPage";

import { AdminDashboard } from "@/pages/Admin/AdminDashboard";
import { AdminDonorsPage } from "@/pages/Admin/AdminDonorsPage";
import { AdminRecipientsPage } from "@/pages/Admin/AdminRecipientsPage";
import { AdminInventoryPage } from "@/pages/Admin/AdminInventoryPage";
import { AdminDonationRecordsPage } from "@/pages/Admin/AdminDonationRecordsPage";
import { AdminReportsPage } from "@/pages/Admin/AdminReportsPage";




import { useAuth } from "@/context/AuthContext";

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

export default function App() {
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

                {/* Public info pages */}
        <Route path="/about" element={<AboutPage />} />
        <Route path="/how-it-works" element={<HowItWorksPage />} />
        <Route
          path="/compatibility-chart"
          element={<CompatibilityChartPage />}
        />
        <Route path="/help" element={<HelpFaqPage />} />


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
        <Route
          path="/donor/notifications"
          element={
            <ProtectedRoute allowedRole="DONOR">
              <DonorNotificationsPage />
            </ProtectedRoute>
          }
        />

        {/* Recipient area */}
        <Route
          path="/recipient"
          element={
            <ProtectedRoute allowedRole="RECIPIENT">
              <RecipientDashboard />
            </ProtectedRoute>
          }
        />

        <Route
  path="/recipient/request"
  element={
    <ProtectedRoute allowedRole="RECIPIENT">
      <RequestBloodPage />
    </ProtectedRoute>
  }
/>

<Route
  path="/recipient/requests"
  element={
    <ProtectedRoute allowedRole="RECIPIENT">
      <RecipientMyRequestsPage />
    </ProtectedRoute>
  }
/>

<Route
  path="/recipient/emergency"
  element={
    <ProtectedRoute allowedRole="RECIPIENT">
      <RecipientEmergencyRequestsPage />
    </ProtectedRoute>
  }
/>

<Route
  path="/recipient/profile"
  element={
    <ProtectedRoute allowedRole="RECIPIENT">
      <RecipientProfilePage />
    </ProtectedRoute>
  }
/>

<Route
  path="/recipient/notifications"
  element={
    <ProtectedRoute allowedRole="RECIPIENT">
      <RecipientNotificationsPage />
    </ProtectedRoute>
  }
/>


{/* Admin area */}
<Route
  path="/admin"
  element={
    <ProtectedRoute allowedRole="ADMIN">
      <AdminDashboard />
    </ProtectedRoute>
  }
/>

<Route
  path="/admin/donors"
  element={
    <ProtectedRoute allowedRole="ADMIN">
      <AdminDonorsPage />
    </ProtectedRoute>
  }
/>
<Route
  path="/admin/recipients"
  element={
    <ProtectedRoute allowedRole="ADMIN">
      <AdminRecipientsPage />
    </ProtectedRoute>
  }
/>

<Route
  path="/admin/inventory"
  element={
    <ProtectedRoute allowedRole="ADMIN">
      <AdminInventoryPage />
    </ProtectedRoute>
  }
/>

<Route
  path="/admin/donations"
  element={
    <ProtectedRoute allowedRole="ADMIN">
      <AdminDonationRecordsPage />
    </ProtectedRoute>
  }
/>

<Route
  path="/admin/reports"
  element={
    <ProtectedRoute allowedRole="ADMIN">
      <AdminReportsPage />
    </ProtectedRoute>
  }
/>



        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </MainLayout>
  );
}
