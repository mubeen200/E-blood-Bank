// backend/src/controllers/adminController.js
const User = require("../models/User");
const Request = require("../models/Request");
const Location = require("../models/BloodBankLocation");
const DonationAppointment = require("../models/DonationAppointment"); // donor appointments

// Donation model is optional – if it's missing we just show 0 / no appointments
let Donation = null;
try {
  Donation = require("../models/Donation");
} catch (err) {
  console.warn(
    "AdminController: ../models/Donation not found. Donation stats & appointments will show 0."
  );
}

/**
 * GET /api/admin/dashboard
 * High-level stats + recent lists for the admin dashboard.
 */
async function getAdminDashboardStats(req, res, next) {
  try {
    // --- Basic counts -------------------------------------------------------
    const [
      totalDonors,
      totalRecipients,
      totalActiveRequests,
      emergencyActiveCount,
      pendingHighUrgencyCount,
    ] = await Promise.all([
      User.countDocuments({ role: "DONOR" }),
      User.countDocuments({ role: "RECIPIENT" }),
      Request.countDocuments({
        status: { $in: ["PENDING", "APPROVED"] },
      }),
      Request.countDocuments({
        isEmergency: true,
        status: { $in: ["PENDING", "APPROVED"] },
      }),
      Request.countDocuments({
        status: "PENDING",
        urgency: "HIGH",
      }),
    ]);

    // --- Request status breakdown (all requests) ---------------------------
    const statusAgg = await Request.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    const requestStatusCounts = {
      PENDING: 0,
      APPROVED: 0,
      FULFILLED: 0,
      REJECTED: 0,
      CANCELLED: 0,
    };

    for (const row of statusAgg) {
      if (
        row._id &&
        Object.prototype.hasOwnProperty.call(requestStatusCounts, row._id)
      ) {
        requestStatusCounts[row._id] = row.count;
      }
    }

    const totalRequests =
      requestStatusCounts.PENDING +
      requestStatusCounts.APPROVED +
      requestStatusCounts.FULFILLED +
      requestStatusCounts.REJECTED +
      requestStatusCounts.CANCELLED;

    // --- Donation stats from DonationAppointment ---------------------------
    let totalSuccessfulDonations = 0;
    let recentDonationDocs = [];

    totalSuccessfulDonations = await DonationAppointment.countDocuments({
      status: "COMPLETED",
    });

    recentDonationDocs = await DonationAppointment.find({
      status: "COMPLETED",
    })
      .sort({ date: -1, createdAt: -1 })
      .limit(5)
      .populate("donor", "name bloodType")
      .populate("location", "name city")
      .lean();

    // --- Recent emergency requests -----------------------------------------
    const recentEmergencyDocs = await Request.find({
      isEmergency: true,
    })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate("recipient", "name bloodType")
      .populate("location", "name city")
      .lean();

    const recentEmergencies = recentEmergencyDocs.map((r) => ({
      id: String(r._id),
      createdAt: r.createdAt,
      bloodType: r.bloodType,
      units: r.units,
      urgency: r.urgency,
      status: r.status,
      recipientName: r.recipient?.name || "Unknown recipient",
      locationName: r.location?.name || "Unknown location",
      locationCity: r.location?.city || "",
    }));

    const recentDonations = recentDonationDocs.map((d) => ({
      id: String(d._id),
      // use donation date if present, otherwise appointment creation time
      createdAt: d.date || d.createdAt,
      bloodType:
        d.bloodType || (d.donor && d.donor.bloodType) || "Unknown",
      units: d.unitsDonated || 1,
      donorName: d.donor?.name || "Unknown donor",
      locationName: d.location?.name || "Unknown location",
      locationCity: d.location?.city || "",
      status: d.status,
    }));

    return res.json({
      stats: {
        totalDonors,
        totalRecipients,
        totalActiveRequests,
        totalSuccessfulDonations,
        emergencyActiveCount,
        totalRequests,
        pendingHighUrgencyCount,
        requestStatusCounts,
      },
      recentEmergencies,
      recentDonations,
    });
  } catch (err) {
    console.error("getAdminDashboardStats error", err);
    next(err);
  }
}

// GET /api/admin/donors
// List donors + latest appointment (scheduled/completed/cancelled)
async function getAdminDonorsList(req, res, next) {
  try {
    const { search } = req.query;

    const filter = { role: "DONOR" };

    if (search && typeof search === "string" && search.trim()) {
      const term = search.trim();
      const regex = new RegExp(term, "i");

      filter.$or = [
        { name: regex },
        { email: regex },
        { phone: regex },
        { cnic: regex },
      ];
    }

    const donors = await User.find(filter).sort({ name: 1 }).lean();

    const donorIds = donors.map((d) => d._id);
    const latestAppointmentByDonor = new Map();

    if (donorIds.length > 0) {
      const appts = await DonationAppointment.find({
        donor: { $in: donorIds },
      })
        // we want latest by date/createdAt, regardless of status
        .populate("location", "name city")
        .sort({ date: -1, createdAt: -1 })
        .lean();

      for (const appt of appts) {
        const key = String(appt.donor);
        // first one we see (because sorted desc) is the latest
        if (!latestAppointmentByDonor.has(key)) {
          latestAppointmentByDonor.set(key, appt);
        }
      }
    }

    const result = donors.map((d) => {
      const key = String(d._id);
      const last = latestAppointmentByDonor.get(key);

      let latestAppointment = null;
      if (last) {
        latestAppointment = {
          id: String(last._id),
          date: last.date,
          timeSlot: last.timeSlot,
          status: last.status, // "SCHEDULED" | "COMPLETED" | "CANCELLED"
          locationName: last.location?.name || "Unknown location",
          locationCity: last.location?.city || "",
          unitsDonated: last.unitsDonated || 0,
        };
      }

      return {
        id: String(d._id),
        name: d.name,
        email: d.email,
        phone: d.phone || "",
        gender: d.gender || "",
        cnic: d.cnic || "",
        bloodType: d.bloodType || "",
        age: d.age ?? null,
        weight: d.weight ?? null,
        healthCondition: d.healthCondition || "",
        totalDonations: d.totalDonations || 0,
        latestAppointment,
      };
    });

    res.json({
      donors: result,
      totalCount: result.length,
    });
  } catch (err) {
    console.error("getAdminDonorsList error", err);
    next(err);
  }
}

// PATCH /api/admin/donor-appointments/:id/complete
// Admin marks a scheduled appointment as completed
// PATCH /api/admin/donor-appointments/:id/complete
// Admin marks a scheduled appointment as completed AND increments inventory
async function markDonationAppointmentCompleted(req, res, next) {
  try {
    const { id } = req.params;

    // Load appointment with full location + donor blood type
    const appt = await DonationAppointment.findById(id)
      .populate("location")                // full Location doc (incl. inventory)
      .populate("donor", "bloodType");     // we need donor.bloodType

    if (!appt) {
      return res.status(404).json({ message: "Appointment not found." });
    }

    if (appt.status === "COMPLETED") {
      return res
        .status(400)
        .json({ message: "Appointment is already completed." });
    }

    if (appt.status === "CANCELLED") {
      return res
        .status(400)
        .json({ message: "Cancelled appointment cannot be completed." });
    }

    // Determine units donated (default 1 if not set)
    if (!appt.unitsDonated || appt.unitsDonated <= 0) {
      appt.unitsDonated = 1;
    }
    const units = appt.unitsDonated;

    // Which blood type are we adding back to inventory?
    const bloodType =
      (appt.donor && appt.donor.bloodType) || null;

    if (!bloodType) {
      return res.status(400).json({
        message:
          "Donor blood type is not set, cannot update blood inventory.",
      });
    }

    // Update inventory at this location
    const locationDoc = appt.location;
    if (!locationDoc) {
      return res
        .status(400)
        .json({ message: "Associated blood bank location not found." });
    }

    // Find or create inventory row for this blood group
    let slot = locationDoc.inventory.find(
      (i) => i.bloodType === bloodType
    );
    if (!slot) {
      // create a new entry with these units
      locationDoc.inventory.push({
        bloodType,
        units,
      });
    } else {
      slot.units = (slot.units || 0) + units;
    }

    // Mark appointment completed
    appt.status = "COMPLETED";

    // Increment donor's totalDonations counter
    const donorId =
      appt.donor && (appt.donor._id || appt.donor);

    await Promise.all([
      appt.save(),
      locationDoc.save(),
      donorId
        ? User.findByIdAndUpdate(donorId, {
            $inc: { totalDonations: units },
          })
        : Promise.resolve(),
    ]);

    return res.json({
      appointment: {
        id: String(appt._id),
        donorId: donorId ? String(donorId) : undefined,
        status: appt.status,
        date: appt.date,
        timeSlot: appt.timeSlot,
        locationName: locationDoc.name || "Unknown location",
        locationCity: locationDoc.city || "",
        unitsDonated: appt.unitsDonated || 0,
      },
    });
  } catch (err) {
    console.error("markDonationAppointmentCompleted error", err);
    next(err);
  }
}


/**
 * GET /api/admin/recipients
 * List all RECIPIENT users with basic stats + their active requests
 * (PENDING / APPROVED) so admin can approve/reject/complete.
 */
async function getAdminRecipientsList(req, res, next) {
  try {
    const { search } = req.query;

    const filter = { role: "RECIPIENT" };

    if (search && typeof search === "string" && search.trim()) {
      const term = search.trim();
      const regex = new RegExp(term, "i");

      filter.$or = [
        { name: regex },
        { email: regex },
        { phone: regex },
        { cnic: regex },
      ];
    }

    const recipients = await User.find(filter).sort({ name: 1 }).lean();
    const recipientIds = recipients.map((r) => r._id);

    const statsByRecipient = new Map();
    const activeByRecipient = new Map();

    if (recipientIds.length > 0) {
      // Aggregate basic stats (total / active / fulfilled)
      const statsAgg = await Request.aggregate([
        {
          $match: {
            recipient: { $in: recipientIds },
          },
        },
        {
          $group: {
            _id: "$recipient",
            totalRequests: { $sum: 1 },
            activeRequests: {
              $sum: {
                $cond: [
                  { $in: ["$status", ["PENDING", "APPROVED"]] },
                  1,
                  0,
                ],
              },
            },
            fulfilledRequests: {
              $sum: {
                $cond: [{ $eq: ["$status", "FULFILLED"] }, 1, 0],
              },
            },
          },
        },
      ]);

      for (const row of statsAgg) {
        statsByRecipient.set(String(row._id), {
          totalRequests: row.totalRequests || 0,
          activeRequestsCount: row.activeRequests || 0,
          fulfilledRequests: row.fulfilledRequests || 0,
        });
      }

      // Load active requests (PENDING / APPROVED)
      const activeReqDocs = await Request.find({
        recipient: { $in: recipientIds },
        status: { $in: ["PENDING", "APPROVED"] },
      })
        .populate("location", "name city")
        .sort({ createdAt: -1 })
        .lean();

      for (const r of activeReqDocs) {
        const key = String(r.recipient);
        const list = activeByRecipient.get(key) || [];
        list.push({
          id: String(r._id),
          bloodType: r.bloodType,
          units: r.units,
          urgency: r.urgency,
          status: r.status,
          isEmergency: !!r.isEmergency,
          locationName: r.location?.name || "Unknown location",
          locationCity: r.location?.city || "",
          createdAt: r.createdAt,
        });
        activeByRecipient.set(key, list);
      }
    }

    const result = recipients.map((rec) => {
      const key = String(rec._id);
      const stats =
        statsByRecipient.get(key) || {
          totalRequests: 0,
          activeRequestsCount: 0,
          fulfilledRequests: 0,
        };

      return {
        id: key,
        name: rec.name,
        email: rec.email,
        phone: rec.phone || "",
        gender: rec.gender || "",
        cnic: rec.cnic || "",
        bloodType: rec.bloodType || "",
        totalRequests: stats.totalRequests,
        activeRequestsCount: stats.activeRequestsCount,
        fulfilledRequests: stats.fulfilledRequests,
        activeRequests: activeByRecipient.get(key) || [],
      };
    });

    return res.json({
      recipients: result,
      totalCount: result.length,
    });
  } catch (err) {
    console.error("getAdminRecipientsList error", err);
    next(err);
  }
}

/**
 * PATCH /api/admin/requests/:id/status
 *
 * Body options:
 *  - { status: "APPROVED" }      -> approve (no inventory change)
 *  - { status: "REJECTED" }      -> reject
 *  - { action: "COMPLETE" }      -> mark completed (FULFILLED) AND decrement inventory
 *  - { status: "FULFILLED" }     -> treated the same as action COMPLETE
 */
async function adminUpdateRequestStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { status, action } = req.body;

    const request = await Request.findById(id).populate(
      "location",
      "name city"
    );

    if (!request) {
      return res.status(404).json({ message: "Request not found." });
    }

    // Once fulfilled / rejected / cancelled, don't touch it
    if (["FULFILLED", "REJECTED", "CANCELLED"].includes(request.status)) {
      return res.status(400).json({
        message: "This request can no longer be updated.",
      });
    }

    const normalizedAction = action ? String(action).toUpperCase() : null;
    const normalizedStatus = status ? String(status).toUpperCase() : null;

    // Helper to perform completion + inventory decrement
    const completeRequest = async () => {
      if (request.status !== "APPROVED") {
        return res.status(400).json({
          message: "Only APPROVED requests can be marked as completed.",
        });
      }

      const locationId =
        request.location && request.location._id
          ? request.location._id
          : request.location;

      const locationDoc = await Location.findById(locationId);
      if (!locationDoc) {
        return res
          .status(400)
          .json({ message: "Associated blood bank location not found." });
      }

      const bloodType = request.bloodType;
      const unitsRequested = request.units || 0;

      const inventoryItem = locationDoc.inventory.find(
        (i) => i.bloodType === bloodType
      );
      const availableUnits = inventoryItem?.units ?? 0;

      if (!inventoryItem || availableUnits < unitsRequested) {
        return res.status(400).json({
          message: `Not enough stock for ${bloodType} at ${locationDoc.name}. Available: ${availableUnits}, required: ${unitsRequested}.`,
        });
      }

      // Decrement stock only on COMPLETE ✔️
      inventoryItem.units = availableUnits - unitsRequested;

      request.status = "FULFILLED";
      request.fulfilledAt = new Date();

      await Promise.all([locationDoc.save(), request.save()]);

      return null;
    };

    // Decide what to do
    if (
      normalizedAction === "COMPLETE" ||
      normalizedAction === "FULFILL" ||
      normalizedStatus === "FULFILLED"
    ) {
      const errorResponse = await completeRequest();
      if (errorResponse) return; // completion already sent an error response
    } else if (normalizedStatus === "APPROVED" || normalizedStatus === "REJECTED") {
      // Simple approve / reject
      request.status = normalizedStatus;
      await request.save();
    } else {
      return res.status(400).json({
        message:
          "Status must be APPROVED or REJECTED, or action must be COMPLETE.",
      });
    }

    return res.json({
      request: {
        id: String(request._id),
        recipientId: String(request.recipient),
        status: request.status,
        bloodType: request.bloodType,
        units: request.units,
        urgency: request.urgency,
        isEmergency: !!request.isEmergency,
        locationName: request.location?.name || "Unknown location",
        locationCity: request.location?.city || "",
        createdAt: request.createdAt,
        fulfilledAt: request.fulfilledAt || null,
      },
    });
  } catch (err) {
    console.error("adminUpdateRequestStatus error", err);
    next(err);
  }
}

// List inventory per location for admin
// GET /api/admin/inventory
async function getAdminInventoryByLocation(req, res, next) {
  try {
    const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

    const locations = await Location.find({}).sort({ name: 1 }).lean();

    const result = locations.map((loc) => {
      const inventoryArray = Array.isArray(loc.inventory) ? loc.inventory : [];

      // map by bloodType
      const invMap = new Map();
      for (const row of inventoryArray) {
        if (!row || !row.bloodType) continue;
        invMap.set(row.bloodType, row);
      }

      const inventory = BLOOD_TYPES.map((bt) => {
        const row = invMap.get(bt) || {};
        const units = typeof row.units === "number" ? row.units : 0;
        const capacity =
          typeof row.capacity === "number" && row.capacity > 0
            ? row.capacity
            : 50; // default capacity

        const utilization = capacity > 0 ? units / capacity : 0;

        let level = "EMPTY";
        if (units <= 0) {
          level = "EMPTY";
        } else if (utilization < 0.4) {
          level = "LOW";
        } else if (utilization < 0.7) {
          level = "MEDIUM";
        } else {
          level = "HIGH";
        }

        return {
          bloodType: bt,
          units,
          capacity,
          utilizationPct: utilization,
          level, // "EMPTY" | "LOW" | "MEDIUM" | "HIGH"
        };
      });

      const totalUnits = inventory.reduce((sum, r) => sum + (r.units || 0), 0);

      return {
        id: String(loc._id),
        name: loc.name,
        city: loc.city || "",
        address: loc.address || "",
        phone: loc.phone || "",
        isActive: loc.isActive !== false,
        totalUnits,
        inventory,
      };
    });

    return res.json({ locations: result });
  } catch (err) {
    console.error("getAdminInventoryByLocation error", err);
    next(err);
  }
}

async function getDonationRecords(req, res, next) {
  try {
    const { search, limit } = req.query;

    // how many records to load at most (safety cap)
    const max = Math.min(parseInt(limit, 10) || 200, 500);

    let docs = await DonationAppointment.find({
      status: "COMPLETED",
    })
      .populate("donor", "name email phone bloodType")
      .populate("location", "name city")
      .sort({ date: -1, createdAt: -1 })
      .limit(max)
      .lean();

    // Optional text search on donor / location
    if (search && typeof search === "string" && search.trim()) {
      const term = search.trim().toLowerCase();
      docs = docs.filter((doc) => {
        const fields = [
          doc.donor?.name,
          doc.donor?.email,
          doc.donor?.phone,
          doc.location?.name,
          doc.location?.city,
        ];
        return fields.some(
          (v) => typeof v === "string" && v.toLowerCase().includes(term)
        );
      });
    }

    const donations = docs.map((d) => ({
      id: String(d._id),
      date: d.date,
      timeSlot: d.timeSlot || "",
      unitsDonated:
        typeof d.unitsDonated === "number" && d.unitsDonated > 0
          ? d.unitsDonated
          : 1,
      donorName: d.donor?.name || "Unknown donor",
      donorEmail: d.donor?.email || "",
      donorPhone: d.donor?.phone || "",
      donorBloodType: d.donor?.bloodType || "",
      locationName: d.location?.name || "Unknown location",
      locationCity: d.location?.city || "",
    }));

    return res.json({
      donations,
      totalCount: donations.length,
    });
  } catch (err) {
    console.error("getDonationRecords error", err);
    next(err);
  }
}

async function getAdminReportsAnalytics(req, res, next) {
  try {
    const now = new Date();
    // last 6 calendar months including current
    const start = new Date(now.getFullYear(), now.getMonth() - 5, 1);

    // ---------- 1. Donations (completed appointments) ----------
    const donationsAgg = await DonationAppointment.aggregate([
      {
        $match: {
          status: "COMPLETED",
          date: { $gte: start },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: "$date" },
            month: { $month: "$date" },
          },
          donations: { $sum: 1 },
          units: {
            $sum: {
              $cond: [
                { $gt: ["$unitsDonated", 0] },
                "$unitsDonated",
                1,
              ],
            },
          },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);

    let totalDonations = 0;
    let totalUnitsDonated = 0;
    const donationsMap = new Map();
    for (const row of donationsAgg) {
      const key = `${row._id.year}-${row._id.month}`;
      donationsMap.set(key, {
        donations: row.donations,
        units: row.units,
      });
      totalDonations += row.donations;
      totalUnitsDonated += row.units;
    }

    const monthlyDonations = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
      const base = donationsMap.get(key) || { donations: 0, units: 0 };
      monthlyDonations.push({
        year: d.getFullYear(),
        month: d.getMonth() + 1,
        label: d.toLocaleString("default", { month: "short" }),
        donations: base.donations,
        units: base.units,
      });
    }

    // ---------- 2. Requests (all statuses, last 6 months) ----------
    const requestsAgg = await Request.aggregate([
      {
        $match: {
          createdAt: { $gte: start },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
          },
          total: { $sum: 1 },
          fulfilled: {
            $sum: {
              $cond: [{ $eq: ["$status", "FULFILLED"] }, 1, 0],
            },
          },
          emergency: {
            $sum: {
              $cond: [{ $eq: ["$isEmergency", true] }, 1, 0],
            },
          },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);

    const requestsMap = new Map();
    let totalRequests = 0;
    let fulfilledRequests = 0;
    for (const row of requestsAgg) {
      const key = `${row._id.year}-${row._id.month}`;
      requestsMap.set(key, {
        total: row.total,
        fulfilled: row.fulfilled,
        emergency: row.emergency,
      });
      totalRequests += row.total;
      fulfilledRequests += row.fulfilled;
    }

    const monthlyRequests = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
      const base =
        requestsMap.get(key) || { total: 0, fulfilled: 0, emergency: 0 };

      monthlyRequests.push({
        year: d.getFullYear(),
        month: d.getMonth() + 1,
        label: d.toLocaleString("default", { month: "short" }),
        total: base.total,
        fulfilled: base.fulfilled,
        emergency: base.emergency,
      });
    }

    // ---------- 3. Blood group request breakdown ----------
    const bloodGroupAgg = await Request.aggregate([
      {
        $group: {
          _id: "$bloodType",
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
    ]);

    const bloodGroupRequests = bloodGroupAgg
      .filter((row) => !!row._id)
      .map((row) => ({
        bloodType: row._id,
        count: row.count,
      }));

    // ---------- 4. Status counts / success rate ----------
    const statusAgg = await Request.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    const statusCounts = {
      PENDING: 0,
      APPROVED: 0,
      FULFILLED: 0,
      REJECTED: 0,
      CANCELLED: 0,
    };
    for (const row of statusAgg) {
      if (row._id && statusCounts[row._id] !== undefined) {
        statusCounts[row._id] = row.count;
      }
    }

    if (!totalRequests) {
      // if no requests in last 6 months, compute total from statusAgg instead
      totalRequests = Object.values(statusCounts).reduce(
        (sum, v) => sum + v,
        0
      );
      fulfilledRequests = statusCounts.FULFILLED || 0;
    }

    const successRate =
      totalRequests > 0
        ? Math.round((fulfilledRequests / totalRequests) * 100)
        : 0;

    const summary = {
      totalDonations,
      totalUnitsDonated,
      totalRequests,
      fulfilledRequests,
      successRate,
      statusCounts,
    };

    return res.json({
      summary,
      monthlyDonations,
      monthlyRequests,
      bloodGroupRequests,
    });
  } catch (err) {
    console.error("getAdminReportsAnalytics error", err);
    next(err);
  }
}

// --------------- keep existing exports, just add getDonationRecords ---------------

module.exports = {
  getAdminDashboardStats,
  getAdminDonorsList,
  markDonationAppointmentCompleted,
  getAdminRecipientsList,
  adminUpdateRequestStatus,
  getAdminInventoryByLocation,
  getDonationRecords,
  getAdminReportsAnalytics, // 👈 NEW   
};
