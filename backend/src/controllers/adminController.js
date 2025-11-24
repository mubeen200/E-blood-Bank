// backend/src/controllers/adminController.js
const User = require("../models/User");
const Request = require("../models/Request");
const Location = require("../models/Location");
const DonationAppointment = require("../models/DonationAppointment"); // 👈 add this

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
    // Basic counts
    const [
      totalDonors,
      totalRecipients,
      totalActiveRequests,
      emergencyActiveCount,
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
    ]);

    // Successful donations (if Donation model exists)
    let totalSuccessfulDonations = 0;
    let recentDonationDocs = [];
    if (Donation) {
      totalSuccessfulDonations = await Donation.countDocuments({
        status: { $in: ["COMPLETED", "FULFILLED"] },
      });

      recentDonationDocs = await Donation.find({})
        .sort({ createdAt: -1 })
        .limit(5)
        .populate("donor", "name bloodType")
        .populate("location", "name city")
        .lean();
    }

    // Recent emergency requests
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
      createdAt: d.createdAt,
      bloodType: d.bloodType,
      units: d.units,
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
async function markDonationAppointmentCompleted(req, res, next) {
  try {
    const { id } = req.params;

    const appt = await DonationAppointment.findById(id).populate(
      "location",
      "name city"
    );

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

    // mark it completed
    appt.status = "COMPLETED";

    // default to 1 unit if not set
    if (!appt.unitsDonated || appt.unitsDonated <= 0) {
      appt.unitsDonated = 1;
    }

    await appt.save();

    // bump donor's total donations counter
    if (appt.donor) {
      await User.findByIdAndUpdate(appt.donor, {
        $inc: { totalDonations: appt.unitsDonated || 1 },
      });
    }

    return res.json({
      appointment: {
        id: String(appt._id),
        donorId: String(appt.donor),
        status: appt.status,
        date: appt.date,
        timeSlot: appt.timeSlot,
        locationName: appt.location?.name || "Unknown location",
        locationCity: appt.location?.city || "",
        unitsDonated: appt.unitsDonated || 0,
      },
    });
  } catch (err) {
    console.error("markDonationAppointmentCompleted error", err);
    next(err);
  }
}


module.exports = {
  getAdminDashboardStats,
  getAdminDonorsList,
  markDonationAppointmentCompleted,
};
