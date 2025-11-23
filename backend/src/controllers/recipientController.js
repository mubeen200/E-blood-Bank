// backend/src/controllers/recipientController.js
const Location = require("../models/Location");
const Request = require("../models/Request");
const User = require("../models/User");
const bcrypt = require("bcrypt");
const Notification = require("../models/Notification");

/**
 * POST /api/recipient/requests
 * Body: {
 *   bloodType, units, urgency, reason, locationId,
 *   isEmergency?, currentLocation?, contactPhone?
 * }
 */
exports.createBloodRequest = async (req, res, next) => {
  try {
    const recipientId = req.user._id;
    const {
      bloodType,
      units,
      urgency,
      reason,
      locationId,
      isEmergency,
      currentLocation,
      contactPhone,
    } = req.body;

    if (!bloodType || !units || !urgency || !locationId) {
      return res.status(400).json({
        message: "Blood type, units, urgency and location are required.",
      });
    }

    const location = await Location.findById(locationId);
    if (!location) {
      return res.status(400).json({ message: "Selected location not found." });
    }

    // Simple stock check: if inventory array exists, check for matching bloodType
    let hasStock = true;
    if (Array.isArray(location.inventory) && location.inventory.length > 0) {
      const entry = location.inventory.find((i) => i.bloodType === bloodType);
      const available = entry ? entry.units || 0 : 0;
      if (available < units) {
        hasStock = false;
      }
    }

    if (!hasStock) {
      return res.status(400).json({
        message: `Selected location currently has no stock for ${bloodType}.`,
      });
    }

    const request = await Request.create({
      recipient: recipientId,
      bloodType,
      units,
      urgency,
      reason,
      location: location._id,
      status: "PENDING",

      // emergency extras
      isEmergency: !!isEmergency,
      currentLocation: currentLocation?.trim() || undefined,
      contactPhone: contactPhone?.trim() || undefined,
    });

    // 🔔 Create a notification for this recipient
    try {
      await Notification.create({
        user: recipientId,
        role: "RECIPIENT",
        title: isEmergency
          ? "Emergency blood request submitted"
          : "Blood request submitted",
        message: `${units} unit(s) of ${bloodType} requested at ${
          location.name
        }${location.city ? " – " + location.city : ""}. Status: PENDING.`,
        type: isEmergency ? "EMERGENCY_REQUEST" : "REQUEST",
        link: "/recipient/requests",
        meta: {
          requestId: request._id,
          locationId: location._id,
          urgency,
          isEmergency: !!isEmergency,
        },
      });
    } catch (notifyErr) {
      console.error("Notification create error (recipient request):", notifyErr);
      // don't fail the main request because of notifications
    }

    res.status(201).json({
      message: "Blood request created.",
      requestId: request._id,
    });
  } catch (err) {
    console.error("createBloodRequest error", err);
    next(err);
  }
};

/**
 * GET /api/recipient/locations
 * Query: ?bloodType=AB+
 * Returns locations that have >0 units for that bloodType (if inventory present)
 */
exports.getLocationsForRecipient = async (req, res, next) => {
  try {
    const { bloodType } = req.query;

    const locations = await Location.find({}).lean();

    let filtered = locations;

    if (bloodType) {
      filtered = locations.filter((loc) => {
        if (Array.isArray(loc.inventory) && loc.inventory.length > 0) {
          const entry = loc.inventory.find((i) => i.bloodType === bloodType);
          return entry && (entry.units || 0) > 0;
        }
        // If no detailed inventory, keep it visible (admin-controlled)
        return true;
      });
    }

    const mapped = filtered.map((loc) => ({
      _id: loc._id,
      name: loc.name,
      city: loc.city,
      address: loc.address,
      contactNumber: loc.contactNumber,
    }));

    res.json({ locations: mapped });
  } catch (err) {
    console.error("getLocationsForRecipient error", err);
    next(err);
  }
};

/**
 * GET /api/recipient/requests/history
 * Returns summary + list of requests for the logged-in recipient.
 */
exports.getRecipientRequestHistory = async (req, res, next) => {
  try {
    const recipientId = req.user._id;

    // Load all requests for this recipient
    const requests = await Request.find({ recipient: recipientId })
      .populate("location")
      .sort({ createdAt: -1 })
      .lean();

    const totalRequests = requests.length;
    const pending = requests.filter((r) => r.status === "PENDING").length;
    const fulfilledList = requests.filter((r) => r.status === "FULFILLED");
    const fulfilled = fulfilledList.length;
    const totalUnitsRequested = requests.reduce(
      (sum, r) => sum + (r.units || 0),
      0
    );

    let lastReceived = null;
    if (fulfilledList.length > 0) {
      const last = fulfilledList[0]; // because sorted desc
      lastReceived = {
        bloodType: last.bloodType,
        units: last.units,
        locationName: last.location ? last.location.name : "",
        fulfilledAt: last.fulfilledAt || last.updatedAt || last.createdAt,
      };
    }

    // Build simple date → totalUnits trend based on createdAt
    const trendMap = new Map();
    for (const r of requests) {
      const dayKey = r.createdAt.toISOString().slice(0, 10); // YYYY-MM-DD
      const prev = trendMap.get(dayKey) || 0;
      trendMap.set(dayKey, prev + (r.units || 0));
    }

    const trend = Array.from(trendMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, totalUnits]) => ({ date, totalUnits }));

    const mappedRequests = requests.map((r) => ({
      _id: r._id,
      createdAt: r.createdAt,
      bloodType: r.bloodType,
      units: r.units,
      locationName: r.location ? r.location.name : "",
      urgency: r.urgency,
      status: r.status,
    }));

    res.json({
      summary: {
        totalRequests,
        pending,
        fulfilled,
        totalUnitsRequested,
        lastReceived,
        trend,
      },
      requests: mappedRequests,
    });
  } catch (err) {
    console.error("getRecipientRequestHistory error", err);
    next(err);
  }
};

exports.cancelRecipientRequest = async (req, res, next) => {
  try {
    const recipientId = req.user._id;
    const { id } = req.params;

    const request = await Request.findOne({ _id: id, recipient: recipientId });
    if (!request) {
      return res.status(404).json({ message: "Request not found." });
    }

    if (["FULFILLED", "REJECTED", "CANCELLED"].includes(request.status)) {
      return res
        .status(400)
        .json({ message: "This request can no longer be cancelled." });
    }

    request.status = "CANCELLED";
    await request.save();

    res.json({
      message: "Request has been cancelled.",
      request,
    });
  } catch (err) {
    console.error("cancelRecipientRequest error", err);
    next(err);
  }
};

// ---------------- Dashboard summary ----------------

async function getRecipientDashboardSummary(req, res, next) {
  try {
    const userId = req.user._id;
    const baseMatch = { recipient: userId };

    // Basic counts
    const [totalRequests, activeRequests, completedRequests] = await Promise.all([
      Request.countDocuments(baseMatch),
      Request.countDocuments({
        ...baseMatch,
        status: { $in: ["PENDING", "APPROVED"] },
      }),
      Request.countDocuments({
        ...baseMatch,
        status: { $in: ["FULFILLED"] },
      }),
    ]);

    // Last completed / fulfilled request
    const last = await Request.findOne({
      recipient: userId,
      status: "FULFILLED",
    })
      .populate("location", "name city")
      .sort({ fulfilledAt: -1, updatedAt: -1 })
      .lean();

    const lastReceived = last
      ? {
          id: String(last._id),
          date: last.fulfilledAt || last.updatedAt || last.createdAt,
          bloodType: last.bloodType,
          units: last.units,
          locationName: last.location?.name || "Unknown location",
          locationCity: last.location?.city || "",
        }
      : null;

    // Urgency breakdown
    const urgencyAgg = await Request.aggregate([
      { $match: baseMatch },
      {
        $group: {
          _id: "$urgency",
          total: { $sum: 1 },
        },
      },
    ]);

    const urgencyBreakdown = { HIGH: 0, MEDIUM: 0, LOW: 0 };
    for (const row of urgencyAgg) {
      if (
        row._id &&
        Object.prototype.hasOwnProperty.call(urgencyBreakdown, row._id)
      ) {
        urgencyBreakdown[row._id] = row.total;
      }
    }

    // Trend – last 6 months
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);

    const trendAgg = await Request.aggregate([
      {
        $match: {
          recipient: userId,
          createdAt: { $gte: sixMonthsAgo },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);

    const trendMap = new Map();
    for (const row of trendAgg) {
      const key = `${row._id.year}-${row._id.month}`;
      trendMap.set(key, row.count);
    }

    const trend = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
      const label = d.toLocaleString("default", { month: "short" });
      trend.push({
        label,
        count: trendMap.get(key) || 0,
      });
    }

    // Recent requests (for bottom-right card)
    const recentDocs = await Request.find(baseMatch)
      .populate("location", "name city")
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    const recent = recentDocs.map((r) => ({
      id: String(r._id),
      createdAt: r.createdAt,
      status: r.status,
      bloodType: r.bloodType,
      units: r.units,
      urgency: r.urgency,
      locationName: r.location?.name || "Unknown location",
      locationCity: r.location?.city || "",
    }));

    return res.json({
      summary: {
        totalRequests,
        activeRequests,
        completedRequests,
        lastReceived,
        urgencyBreakdown,
        trend,
        recent,
      },
    });
  } catch (err) {
    console.error("getRecipientDashboardSummary error", err);
    next(err);
  }
}

exports.getRecipientDashboardSummary = getRecipientDashboardSummary;

// ---------------- Notifications (recipient) ----------------

/**
 * GET /api/recipient/notifications
 */
exports.getRecipientNotifications = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const notifications = await Notification.find({ user: userId })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    const unreadCount = notifications.filter((n) => !n.isRead).length;

    res.json({ notifications, unreadCount });
  } catch (err) {
    console.error("getRecipientNotifications error", err);
    next(err);
  }
};

/**
 * PATCH /api/recipient/notifications/:id/read
 */
exports.markRecipientNotificationRead = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { id } = req.params;

    const notif = await Notification.findOneAndUpdate(
      { _id: id, user: userId },
      { isRead: true },
      { new: true }
    );

    if (!notif) {
      return res.status(404).json({ message: "Notification not found." });
    }

    res.json({ notification: notif });
  } catch (err) {
    console.error("markRecipientNotificationRead error", err);
    next(err);
  }
};

/**
 * PATCH /api/recipient/notifications/read-all
 */
exports.markAllRecipientNotificationsRead = async (req, res, next) => {
  try {
    const userId = req.user._id;

    await Notification.updateMany(
      { user: userId, isRead: false },
      { isRead: true }
    );

    res.json({ message: "All notifications marked as read." });
  } catch (err) {
    console.error("markAllRecipientNotificationsRead error", err);
    next(err);
  }
};

// ---------------- Profile & password ----------------

/**
 * GET /api/recipient/profile
 */
exports.getRecipientProfile = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const user = await User.findById(userId).select("-passwordHash -__v");
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    res.json({ user });
  } catch (err) {
    console.error("getRecipientProfile error", err);
    next(err);
  }
};

/**
 * PUT /api/recipient/profile
 */
exports.updateRecipientProfile = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { name, phone, gender, cnic } = req.body;

    const update = {
      name: name?.trim(),
      phone: phone?.trim(),
      gender: gender || undefined,
      cnic: cnic?.trim() || undefined,
    };

    const user = await User.findByIdAndUpdate(userId, update, {
      new: true,
      runValidators: true,
    }).select("-passwordHash -__v");

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    res.json({ user });
  } catch (err) {
    console.error("updateRecipientProfile error", err);
    next(err);
  }
};

/**
 * PUT /api/recipient/change-password
 */
exports.changeRecipientPassword = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res
        .status(400)
        .json({ message: "Current password and new password are required." });
    }

    if (newPassword.length < 8) {
      return res
        .status(400)
        .json({ message: "New password must be at least 8 characters." });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) {
      return res.status(400).json({ message: "Current password is incorrect." });
    }

    const hash = await bcrypt.hash(newPassword, 10);
    user.passwordHash = hash;
    await user.save();

    res.json({ message: "Password updated successfully." });
  } catch (err) {
    console.error("changeRecipientPassword error", err);
    next(err);
  }
};
