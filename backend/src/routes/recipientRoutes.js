// backend/src/routes/recipientRoutes.js
const express = require("express");
const { auth, requireRole } = require("../middleware/authMiddleware");
const {
  createBloodRequest,
  getLocationsForRecipient,
  getRecipientRequestHistory,
  cancelRecipientRequest,
  getRecipientDashboardSummary,
  getRecipientProfile,
  updateRecipientProfile,
  changeRecipientPassword,
  getRecipientNotifications,
  markRecipientNotificationRead,
  markAllRecipientNotificationsRead,
} = require("../controllers/recipientController");

const router = express.Router();

// Recipient: list suitable locations by blood type
router.get(
  "/locations",
  auth,
  requireRole("RECIPIENT"),
  getLocationsForRecipient
);

// Recipient: create new blood request (normal + emergency)
router.post(
  "/requests",
  auth,
  requireRole("RECIPIENT"),
  createBloodRequest
);

// Recipient: history & analytics list
router.get(
  "/requests/history",
  auth,
  requireRole("RECIPIENT"),
  getRecipientRequestHistory
);

// Recipient: cancel a request
router.patch(
  "/requests/:id/cancel",
  auth,
  requireRole("RECIPIENT"),
  cancelRecipientRequest
);

// Recipient: dashboard summary
router.get(
  "/dashboard",
  auth,
  requireRole("RECIPIENT"),
  getRecipientDashboardSummary
);

// Recipient: profile
router.get(
  "/profile",
  auth,
  requireRole("RECIPIENT"),
  getRecipientProfile
);

router.put(
  "/profile",
  auth,
  requireRole("RECIPIENT"),
  updateRecipientProfile
);

// Recipient: change password
router.put(
  "/change-password",
  auth,
  requireRole("RECIPIENT"),
  changeRecipientPassword
);

// Recipient: notifications
router.get(
  "/notifications",
  auth,
  requireRole("RECIPIENT"),
  getRecipientNotifications
);

router.patch(
  "/notifications/:id/read",
  auth,
  requireRole("RECIPIENT"),
  markRecipientNotificationRead
);

router.patch(
  "/notifications/read-all",
  auth,
  requireRole("RECIPIENT"),
  markAllRecipientNotificationsRead
);

module.exports = router;
