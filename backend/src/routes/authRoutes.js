const express = require("express");
const {
  registerDonor,
  registerRecipient,
  login,
  logout,
  getMe,
} = require("../controllers/authController");
const { auth } = require("../middleware/authMiddleware");

const router = express.Router();

// Donor / recipient registration
router.post("/register-donor", registerDonor);
router.post("/register-recipient", registerRecipient);

// Login / logout
router.post("/login", login);          // <-- LOGIN IS POST HERE
router.post("/logout", logout);

// Current user
router.get("/me", auth, getMe);

module.exports = router;
