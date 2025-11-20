const express = require("express");
const {
  getDonorOverview,
  getDonorLocations,
  getDonorAppointments,
  createDonationAppointment,
  cancelDonationAppointment,
  getDonationHistory,
  getDonorProfile,
  updateDonorProfile,
  changeDonorPassword,
} = require("../controllers/donorController");
const { auth, requireRole } = require("../middleware/authMiddleware");

const router = express.Router();

// All donor routes require authenticated DONOR
router.use(auth, requireRole("DONOR"));

router.get("/overview", getDonorOverview);
router.get("/locations", getDonorLocations);
router.get("/appointments", getDonorAppointments);
router.post("/appointments", createDonationAppointment);
router.patch("/appointments/:id/cancel", cancelDonationAppointment);

router.get("/donations", getDonationHistory);

// Profile
router.get("/profile", getDonorProfile);
router.put("/profile", updateDonorProfile);
router.put("/change-password", changeDonorPassword);

module.exports = router;
