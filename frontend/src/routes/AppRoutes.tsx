import { BrowserRouter, Routes, Route } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { LandingPage } from "@/pages/LandingPage";
import { AboutPage } from "@/pages/AboutPage";
import { HowItWorksPage } from "@/pages/HowItWorksPage";
import { CompatibilityChartPage } from "@/pages/CompatibilityChartPage";
import { LoginPage } from "@/pages/auth/LoginPage";
import { RegisterDonorPage } from "@/pages/auth/RegisterDonorPage";
import { RegisterRecipientPage } from "@/pages/auth/RegisterRecipientPage";
import { AdminDashboard } from "@/pages/Admin/AdminDashboard";
import { DonorDashboard } from "@/pages/Donor/DonorDashboard";
import { RecipientDashboard } from "@/pages/Recipient/RecipientDashboard";

export function AppRoutes() {
  return (
    <BrowserRouter>
      <MainLayout>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/how-it-works" element={<HowItWorksPage />} />
          <Route
            path="/compatibility-chart"
            element={<CompatibilityChartPage />}
          />

          <Route path="/login" element={<LoginPage />} />
          <Route path="/register-donor" element={<RegisterDonorPage />} />
          <Route
            path="/register-recipient"
            element={<RegisterRecipientPage />}
          />

          {/* Dashboards – protected later */}
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/donor" element={<DonorDashboard />} />
          <Route path="/recipient" element={<RecipientDashboard />} />
        </Routes>
      </MainLayout>
    </BrowserRouter>
  );
}
