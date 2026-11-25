// backend/src/controllers/adminController.js
const User = require("../models/User");
const Request = require("../models/Request");
const BloodBankLocation = require("../models/BloodBankLocation");
const DonationAppointment = require("../models/DonationAppointment");
const Notification = require("../models/Notification");
const {
  BLOOD_TYPES,
  DEFAULT_CAPACITY,
  classifyStockLevel,
  escapeRegex,
} = require("../utils/inventoryHelper");

/**
 * GET /api/admin/dashboard
 * High-level stats + recent lists for the admin dashboard.
 */
async function getAdminDashboardStats(req, res, next) {
  try {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // --- Basic counts + accurate 24h/7d activity ---------------------------
    const [
      totalDonors,
      totalRecipients,
      totalActiveRequests,
      emergencyActiveCount,
      pendingHighUrgencyCount,
      emergenciesLast24h,
      emergenciesLast7d,
      donationsLast24h,
      donationsLast7d,
      emergencyLocationIds,
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
      Request.countDocuments({
        isEmergency: true,
        createdAt: { $gte: oneDayAgo },
      }),
      Request.countDocuments({
        isEmergency: true,
        createdAt: { $gte: sevenDaysAgo },
      }),
      DonationAppointment.countDocuments({
        status: "COMPLETED",
        date: { $gte: oneDayAgo },
      }),
      DonationAppointment.countDocuments({
        status: "COMPLETED",
        date: { $gte: sevenDaysAgo },
      }),
      Request.distinct("location", {
        isEmergency: true,
        status: { $in: ["PENDING", "APPROVED"] },
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
    const [totalSuccessfulDonations, recentDonationDocs, recentEmergencyDocs] =
      await Promise.all([
        DonationAppointment.countDocuments({ status: "COMPLETED" }),
        DonationAppointment.find({ status: "COMPLETED" })
          .sort({ date: -1, createdAt: -1 })
          .limit(5)
          .populate("donor", "name bloodType")
          .populate("location", "name city")
          .lean(),
        Request.find({ isEmergency: true })
          .sort({ createdAt: -1 })
          .limit(5)
          .populate("recipient", "name bloodType")
          .populate("location", "name city")
          .lean(),
      ]);

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
      createdAt: d.date || d.createdAt,
      bloodType: d.bloodType || (d.donor && d.donor.bloodType) || "Unknown",
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
        recentActivity: {
          emergenciesLast24h,
          emergenciesLast7d,
          donationsLast24h,
          donationsLast7d,
          locationsWithEmergencies: Array.isArray(emergencyLocationIds)
            ? emergencyLocationIds.length
            : 0,
        },
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
// List donors + prioritized active SCHEDULED appointment (or latest COMPLETED/CANCELLED)
async function getAdminDonorsList(req, res, next) {
  try {
    const { search } = req.query;

    const filter = { role: "DONOR" };

    if (search && typeof search === "string" && search.trim()) {
      const term = escapeRegex(search.trim());
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
        .populate("location", "name city")
        .sort({ date: -1, createdAt: -1 })
        .lean();

      // Prioritize any active SCHEDULED appointment so admin can always mark it completed,
      // even if a later CANCELLED appointment exists.
      for (const appt of appts) {
        const key = String(appt.donor);
        const existing = latestAppointmentByDonor.get(key);
        if (!existing) {
          latestAppointmentByDonor.set(key, appt);
        } else if (existing.status !== "SCHEDULED" && appt.status === "SCHEDULED") {
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
// Admin marks a scheduled appointment as completed, atomically increments inventory,
// updates donor's totalDonations & 56-day nextEligibleDonationDate, and notifies donor.
async function markDonationAppointmentCompleted(req, res, next) {
  try {
    const { id } = req.params;

    const appt = await DonationAppointment.findById(id)
      .populate("location")
      .populate("donor", "bloodType name");

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

    const rawUnits = req.body?.unitsDonated ?? appt.unitsDonated ?? 1;
    const units = Number(rawUnits);
    if (!Number.isInteger(units) || units < 1) {
      return res
        .status(400)
        .json({ message: "Units donated must be a positive whole number." });
    }

    const bloodType = (appt.donor && appt.donor.bloodType) || null;
    if (!bloodType) {
      return res.status(400).json({
        message:
          "Donor blood type is not set, cannot update blood inventory.",
      });
    }

    const locationDoc = appt.location;
    if (!locationDoc) {
      return res
        .status(400)
        .json({ message: "Associated blood bank location not found." });
    }

    const locationId = locationDoc._id || locationDoc;
    const invArray = Array.isArray(locationDoc.inventory)
      ? locationDoc.inventory
      : [];
    const existingSlot = invArray.find((i) => i.bloodType === bloodType);
    const capacity =
      existingSlot && typeof existingSlot.capacity === "number" && existingSlot.capacity > 0
        ? existingSlot.capacity
        : DEFAULT_CAPACITY;

    // Enforce capacity & perform atomic inventory update to avoid lost updates
    if (existingSlot) {
      const currentUnits = existingSlot.units || 0;
      if (currentUnits + units > capacity) {
        return res.status(400).json({
          message: `Cannot complete donation: adding ${units} unit(s) would exceed ${locationDoc.name}'s capacity for ${bloodType} (${currentUnits}/${capacity}).`,
        });
      }

      const updatedLoc = await BloodBankLocation.findOneAndUpdate(
        {
          _id: locationId,
          inventory: {
            $elemMatch: {
              bloodType,
              units: { $lte: capacity - units },
            },
          },
        },
        {
          $inc: { "inventory.$.units": units },
        },
        { new: true }
      );

      if (!updatedLoc) {
        return res.status(400).json({
          message: `Cannot complete donation: ${locationDoc.name} does not have enough remaining capacity for ${bloodType}.`,
        });
      }
    } else {
      if (units > capacity) {
        return res.status(400).json({
          message: `Cannot complete donation: ${units} unit(s) exceeds capacity (${capacity}) for ${bloodType}.`,
        });
      }

      await BloodBankLocation.findByIdAndUpdate(
        locationId,
        {
          $push: {
            inventory: { bloodType, units, capacity },
          },
        },
        { new: true }
      );
    }

    appt.unitsDonated = units;
    appt.status = "COMPLETED";

    const donorId = appt.donor && (appt.donor._id || appt.donor);

    // Always recalculate 56-day cooldown from this completed donation's date
    const nextEligible = new Date(appt.date || Date.now());
    nextEligible.setHours(0, 0, 0, 0);
    nextEligible.setDate(nextEligible.getDate() + 56);

    await Promise.all([
      appt.save(),
      donorId
        ? User.findByIdAndUpdate(donorId, {
            $inc: { totalDonations: 1 },
            $set: { nextEligibleDonationDate: nextEligible },
          })
        : Promise.resolve(),
    ]);

    // Notify donor of completed donation
    if (donorId) {
      try {
        await Notification.create({
          user: donorId,
          role: "DONOR",
          type: "DONATION_COMPLETED",
          title: "Donation completed — thank you!",
          message: `Your donation of ${units} unit(s) of ${bloodType} at ${
            locationDoc.name || "the blood bank"
          } has been recorded. Next eligible date: ${nextEligible.toLocaleDateString()}.`,
          meta: {
            appointmentId: appt._id,
            locationName: locationDoc.name,
            date: appt.date,
            timeSlot: appt.timeSlot,
            unitsDonated: units,
          },
        });
      } catch (notifyErr) {
        console.error("Failed to create DONATION_COMPLETED notification:", notifyErr);
      }
    }

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
      const term = escapeRegex(search.trim());
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
      const stats = statsByRecipient.get(key) || {
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
 *  - { status: "APPROVED" }      -> approve (validates unreserved stock availability)
 *  - { status: "REJECTED" }      -> reject
 *  - { action: "COMPLETE" }      -> mark completed (FULFILLED) AND atomically decrement inventory
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

    if (["FULFILLED", "REJECTED", "CANCELLED"].includes(request.status)) {
      return res.status(400).json({
        message: "This request can no longer be updated.",
      });
    }

    const normalizedAction = action ? String(action).toUpperCase() : null;
    const normalizedStatus = status ? String(status).toUpperCase() : null;

    const locationId =
      request.location && request.location._id
        ? request.location._id
        : request.location;

    const completeRequest = async () => {
      if (request.status !== "APPROVED") {
        return res.status(400).json({
          message: "Only APPROVED requests can be marked as completed.",
        });
      }

      const bloodType = request.bloodType;
      const unitsRequested = request.units || 0;

      // Atomic stock check + decrement prevents race conditions / negative stock
      const updatedLocation = await BloodBankLocation.findOneAndUpdate(
        {
          _id: locationId,
          inventory: {
            $elemMatch: {
              bloodType,
              units: { $gte: unitsRequested },
            },
          },
        },
        {
          $inc: { "inventory.$.units": -unitsRequested },
        },
        { new: true }
      );

      if (!updatedLocation) {
        const locationDoc = await BloodBankLocation.findById(locationId).lean();
        if (!locationDoc) {
          return res
            .status(400)
            .json({ message: "Associated blood bank location not found." });
        }
        const inventoryItem = (locationDoc.inventory || []).find(
          (i) => i.bloodType === bloodType
        );
        const availableUnits = inventoryItem?.units ?? 0;
        return res.status(400).json({
          message: `Not enough stock for ${bloodType} at ${locationDoc.name}. Available: ${availableUnits}, required: ${unitsRequested}.`,
        });
      }

      request.status = "FULFILLED";
      request.fulfilledAt = new Date();
      await request.save();

      return null;
    };

    if (
      normalizedAction === "COMPLETE" ||
      normalizedAction === "FULFILL" ||
      normalizedStatus === "FULFILLED"
    ) {
      const errorResponse = await completeRequest();
      if (errorResponse) return;
    } else if (normalizedStatus === "APPROVED") {
      if (request.status !== "PENDING") {
        return res.status(400).json({
          message: "Only PENDING requests can be approved.",
        });
      }

      // Prevent overbooking: ensure (stock - already APPROVED units) >= request.units
      const [locationDoc, reservedAgg] = await Promise.all([
        BloodBankLocation.findById(locationId).lean(),
        Request.aggregate([
          {
            $match: {
              _id: { $ne: request._id },
              location: locationId,
              bloodType: request.bloodType,
              status: "APPROVED",
            },
          },
          {
            $group: {
              _id: null,
              reservedUnits: { $sum: "$units" },
            },
          },
        ]),
      ]);

      if (!locationDoc) {
        return res
          .status(400)
          .json({ message: "Associated blood bank location not found." });
      }

      const inventoryItem = (locationDoc.inventory || []).find(
        (i) => i.bloodType === request.bloodType
      );
      const availableUnits = inventoryItem?.units ?? 0;
      const reservedUnits = reservedAgg[0]?.reservedUnits || 0;
      const unreservedUnits = availableUnits - reservedUnits;

      if (unreservedUnits < request.units) {
        return res.status(400).json({
          message: `Not enough unreserved stock to approve ${request.units} unit(s) of ${request.bloodType} at ${locationDoc.name}. Available: ${availableUnits}, already reserved: ${reservedUnits}.`,
        });
      }

      request.status = "APPROVED";
      await request.save();
    } else if (normalizedStatus === "REJECTED") {
      request.status = "REJECTED";
      await request.save();
    } else {
      return res.status(400).json({
        message:
          "Status must be APPROVED or REJECTED, or action must be COMPLETE.",
      });
    }

    // Notify recipient of status change
    try {
      const locationName = request.location?.name || "the blood bank";
      const statusLabel =
        request.status === "APPROVED"
          ? "approved"
          : request.status === "FULFILLED"
          ? "fulfilled"
          : "rejected";

      await Notification.create({
        user: request.recipient,
        role: "RECIPIENT",
        type: request.isEmergency ? "EMERGENCY_REQUEST" : "REQUEST",
        title: `Blood request ${statusLabel}`,
        message: `Your request for ${request.units} unit(s) of ${request.bloodType} at ${locationName} has been ${statusLabel}.`,
        link: "/recipient/requests",
        meta: {
          requestId: request._id,
          locationId,
          status: request.status,
          isEmergency: !!request.isEmergency,
        },
      });
    } catch (notifyErr) {
      console.error("Failed to create recipient status notification:", notifyErr);
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
    const locations = await BloodBankLocation.find({}).sort({ name: 1 }).lean();

    const result = locations.map((loc) => {
      const inventoryArray = Array.isArray(loc.inventory) ? loc.inventory : [];

      const invMap = new Map();
      for (const row of inventoryArray) {
        if (!row || !row.bloodType) continue;
        invMap.set(row.bloodType, row);
      }

      let lowOrEmptyCount = 0;
      const inventory = BLOOD_TYPES.map((bt) => {
        const row = invMap.get(bt) || {};
        const classified = classifyStockLevel(row.units, row.capacity);
        if (classified.isLowOrEmpty) lowOrEmptyCount += 1;

        return {
          bloodType: bt,
          units: classified.units,
          capacity: classified.capacity,
          utilizationPct: classified.utilizationPct,
          level: classified.level,
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
        lowOrEmptyCount,
        inventory,
      };
    });

    return res.json({
      locations: result,
      totalLocations: result.length,
    });
  } catch (err) {
    console.error("getAdminInventoryByLocation error", err);
    next(err);
  }
}

async function getDonationRecords(req, res, next) {
  try {
    const { search, limit } = req.query;

    const max = Math.min(parseInt(limit, 10) || 200, 500);

    let docs = await DonationAppointment.find({
      status: "COMPLETED",
    })
      .populate("donor", "name email phone bloodType")
      .populate("location", "name city")
      .sort({ date: -1, createdAt: -1 })
      .limit(max)
      .lean();

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
    const start = new Date(now.getFullYear(), now.getMonth() - 5, 1);

    // ---------- 1. Donations: all-time summary + last 6 months trend ----------
    const [allTimeDonationsAgg, donationsAgg] = await Promise.all([
      DonationAppointment.aggregate([
        { $match: { status: "COMPLETED" } },
        {
          $group: {
            _id: null,
            donations: { $sum: 1 },
            units: {
              $sum: {
                $cond: [{ $gt: ["$unitsDonated", 0] }, "$unitsDonated", 1],
              },
            },
          },
        },
      ]),
      DonationAppointment.aggregate([
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
                $cond: [{ $gt: ["$unitsDonated", 0] }, "$unitsDonated", 1],
              },
            },
          },
        },
        { $sort: { "_id.year": 1, "_id.month": 1 } },
      ]),
    ]);

    const totalDonations = allTimeDonationsAgg[0]?.donations || 0;
    const totalUnitsDonated = allTimeDonationsAgg[0]?.units || 0;

    const donationsMap = new Map();
    for (const row of donationsAgg) {
      const key = `${row._id.year}-${row._id.month}`;
      donationsMap.set(key, {
        donations: row.donations,
        units: row.units,
      });
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

    // ---------- 2. Requests (last 6 months trend) ----------
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
    for (const row of requestsAgg) {
      const key = `${row._id.year}-${row._id.month}`;
      requestsMap.set(key, {
        total: row.total,
        fulfilled: row.fulfilled,
        emergency: row.emergency,
      });
    }

    const monthlyRequests = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
      const base = requestsMap.get(key) || {
        total: 0,
        fulfilled: 0,
        emergency: 0,
      };

      monthlyRequests.push({
        year: d.getFullYear(),
        month: d.getMonth() + 1,
        label: d.toLocaleString("default", { month: "short" }),
        total: base.total,
        fulfilled: base.fulfilled,
        emergency: base.emergency,
      });
    }

    // ---------- 3. Blood group request breakdown (all-time) ----------
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

    // ---------- 4. All-time status counts & consistent summary ----------
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

    const totalRequests = Object.values(statusCounts).reduce(
      (sum, v) => sum + v,
      0
    );
    const fulfilledRequests = statusCounts.FULFILLED || 0;

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

module.exports = {
  getAdminDashboardStats,
  getAdminDonorsList,
  markDonationAppointmentCompleted,
  getAdminRecipientsList,
  adminUpdateRequestStatus,
  getAdminInventoryByLocation,
  getDonationRecords,
  getAdminReportsAnalytics,
};
