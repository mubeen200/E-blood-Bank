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

router.post("/register-donor", registerDonor);
router.post("/register-recipient", registerRecipient);
router.post("/login", login);
router.post("/logout", logout);
router.get("/me", auth, getMe);

module.exports = router;
