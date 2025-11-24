// backend/src/routes/adminRoutes.js
const express = require("express");
const { auth, requireRole } = require("../middleware/authMiddleware");
const {
  getAdminDashboardStats,
  getAdminDonorsList,
  markDonationAppointmentCompleted,
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

module.exports = router;
