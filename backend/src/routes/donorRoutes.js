const express = require("express");
const {
  getDonorOverview,
  getDonorLocations,
  getDonorAppointments,
  createDonationAppointment,
  cancelDonationAppointment,
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

module.exports = router;
