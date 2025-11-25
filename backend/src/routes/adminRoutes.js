// backend/src/routes/adminRoutes.js
const express = require("express");
const { auth, requireRole } = require("../middleware/authMiddleware");
const {
  getAdminDashboardStats,
  getAdminDonorsList,
  markDonationAppointmentCompleted,
  getAdminRecipientsList,
  adminUpdateRequestStatus,
  getAdminInventoryByLocation,
  getDonationRecords, 
  getAdminReportsAnalytics,// 👈 NEW
} = require("../controllers/adminController");

const router = express.Router();

// Admin: dashboard summary
router.get(
  "/dashboard",
  auth,
  requireRole("ADMIN"),
  getAdminDashboardStats
);

// Admin: manage donors list + latest appointments
router.get("/donors", auth, requireRole("ADMIN"), getAdminDonorsList);

// Admin: mark a donation appointment completed
router.patch(
  "/donor-appointments/:id/complete",
  auth,
  requireRole("ADMIN"),
  markDonationAppointmentCompleted
);

// Admin: manage recipients
router.get("/recipients", auth, requireRole("ADMIN"), getAdminRecipientsList);

// Admin: approve / reject / complete blood request
router.patch(
  "/requests/:id/status",
  auth,
  requireRole("ADMIN"),
  adminUpdateRequestStatus
);

// Admin: inventory per location
router.get(
  "/inventory",
  auth,
  requireRole("ADMIN"),
  getAdminInventoryByLocation
);

router.get(
  "/donations",
  auth,
  requireRole("ADMIN"),
  getDonationRecords
);

router.get(
  "/reports",
  auth,
  requireRole("ADMIN"),
  getAdminReportsAnalytics
);

module.exports = router;
