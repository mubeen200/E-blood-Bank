const bcrypt = require("bcrypt");
const DonationAppointment = require("../models/DonationAppointment");
const BloodBankLocation = require("../models/BloodBankLocation");
const User = require("../models/User");
const Notification = require("../models/Notification");
const {
  BLOOD_TYPES,
  classifyStockLevel,
  parseLocalDate,
} = require("../utils/inventoryHelper");

function sanitizeUserDoc(userDoc) {
  const obj = userDoc.toObject();
  delete obj.passwordHash;
  delete obj.__v;
  return obj;
}

/**
 * Evaluate donor eligibility.
 * - Requires age (18..70) and weight (>= 40 kg) to be present on profile.
 * - Compares targetDate (default: today) against nextEligibleDate.
 */
function buildEligibility(user, nextEligibleDate, targetDate = null) {
  const reasons = [];
  let eligible = true;

  if (user.age === undefined || user.age === null) {
    eligible = false;
    reasons.push("Please add your age in your profile to verify eligibility.");
  } else {
    if (user.age < 18) {
      eligible = false;
      reasons.push("You must be at least 18 years old to donate.");
    }
    if (user.age > 70) {
      eligible = false;
      reasons.push("Maximum donation age is 70 years.");
    }
  }

  if (user.weight === undefined || user.weight === null) {
    eligible = false;
    reasons.push("Please add your weight in your profile to verify eligibility.");
  } else if (user.weight < 40) {
    eligible = false;
    reasons.push("Weight must be at least 40 kg to donate.");
  }

  if (nextEligibleDate) {
    const compareDate = targetDate ? new Date(targetDate) : new Date();
    compareDate.setHours(0, 0, 0, 0);
    const next = new Date(nextEligibleDate);
    next.setHours(0, 0, 0, 0);

    if (targetDate) {
      if (compareDate < next) {
        eligible = false;
        reasons.push(
          `You can only book an appointment on or after ${next.toLocaleDateString()} based on your last donation.`
        );
      }
    } else if (next > compareDate) {
      eligible = false;
      reasons.push(
        `You can donate again on or after ${next.toLocaleDateString()} based on your last donation.`
      );
    }
  }

  return { eligible, reasons };
}

/**
 * Always resolve the freshest nextEligibleDonationDate from both User doc
 * and the latest COMPLETED DonationAppointment so stale dates cannot bypass the 56-day cooldown.
 */
async function resolveNextEligibleDate(user) {
  let nextEligibleDate = user.nextEligibleDonationDate
    ? new Date(user.nextEligibleDonationDate)
    : null;

  const lastDonation = await DonationAppointment.findOne({
    donor: user._id,
    status: "COMPLETED",
  })
    .sort({ date: -1, updatedAt: -1 })
    .lean();

  if (lastDonation && lastDonation.date) {
    const derived = new Date(lastDonation.date);
    derived.setHours(0, 0, 0, 0);
    derived.setDate(derived.getDate() + 56);

    if (!nextEligibleDate || derived > nextEligibleDate) {
      nextEligibleDate = derived;
      user.nextEligibleDonationDate = derived;
      if (typeof user.save === "function") {
        await user.save();
      }
    }
  }

  return nextEligibleDate;
}

// Serialize appointment / donation for frontend
function serializeAppointment(doc) {
  const obj = typeof doc.toObject === "function" ? doc.toObject({ virtuals: false }) : doc;
  const location = obj.location;

  return {
    _id: obj._id,
    date: obj.date,
    timeSlot: obj.timeSlot,
    status: obj.status,
    unitsDonated: obj.unitsDonated ?? null,
    location: location
      ? {
          _id: location._id,
          name: location.name,
          city: location.city,
        }
      : null,
  };
}

// GET /api/donor/overview
exports.getDonorOverview = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "Donor not found." });
    }

    const nextEligibleDate = await resolveNextEligibleDate(user);
    const { eligible, reasons } = buildEligibility(user, nextEligibleDate);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [completedDonations, upcomingAppointments] = await Promise.all([
      DonationAppointment.find({
        donor: userId,
        status: "COMPLETED",
      })
        .select("unitsDonated")
        .lean(),
      DonationAppointment.countDocuments({
        donor: userId,
        status: "SCHEDULED",
        date: { $gte: today },
      }),
    ]);

    const totalCompleted = completedDonations.length;
    const totalUnitsDonated = completedDonations.reduce(
      (sum, d) =>
        sum + (typeof d.unitsDonated === "number" && d.unitsDonated > 0 ? d.unitsDonated : 1),
      0
    );

    const overview = {
      eligibility: { eligible, reasons },
      nextEligibleDonationDate: nextEligibleDate,
      stats: {
        totalDonations: totalCompleted,
        totalUnitsDonated,
        upcomingAppointments,
      },
    };

    res.json(overview);
  } catch (err) {
    console.error("getDonorOverview error:", err);
    next(err);
  }
};

// GET /api/donor/locations
exports.getDonorLocations = async (req, res, next) => {
  try {
    const userBloodType = req.user.bloodType;
    if (!BLOOD_TYPES.includes(userBloodType)) {
      return res.status(400).json({ message: "Invalid blood type on profile." });
    }

    const locations = await BloodBankLocation.find({ isActive: { $ne: false } }).lean();

    const mapped = locations.map((loc) => {
      const inv = (loc.inventory || []).find(
        (i) => i.bloodType === userBloodType
      );

      // Missing inventory entry means 0 units available -> LOW & recommended
      const units = inv && typeof inv.units === "number" ? inv.units : 0;
      const capacity = inv && typeof inv.capacity === "number" ? inv.capacity : 50;
      const { level, isLowOrEmpty } = classifyStockLevel(units, capacity);

      const stockLevel = level === "EMPTY" ? "LOW" : level;
      const isRecommended = isLowOrEmpty;

      return {
        _id: loc._id,
        name: loc.name,
        city: loc.city,
        address: loc.address,
        distanceKm: loc.distanceKm,
        isRecommended,
        stockLevel,
      };
    });

    res.json({ locations: mapped });
  } catch (err) {
    console.error("getDonorLocations error:", err);
    next(err);
  }
};

// GET /api/donor/appointments
exports.getDonorAppointments = async (req, res, next) => {
  try {
    const appointments = await DonationAppointment.find({
      donor: req.user._id,
    })
      .sort({ date: -1 })
      .populate("location", "name city")
      .exec();

    const mapped = appointments.map(serializeAppointment);

    res.json({ appointments: mapped });
  } catch (err) {
    console.error("getDonorAppointments error:", err);
    next(err);
  }
};

// POST /api/donor/appointments
exports.createDonationAppointment = async (req, res, next) => {
  try {
    const { locationId, date, timeSlot } = req.body;

    if (!locationId || !date || !timeSlot) {
      return res
        .status(400)
        .json({ message: "Location, date and time slot are required." });
    }

    const location = await BloodBankLocation.findById(locationId);
    if (!location || location.isActive === false) {
      return res.status(404).json({ message: "Blood bank not found or inactive." });
    }

    // Parse and normalize selected date safely without UTC-offset shift
    const selectedDate = parseLocalDate(date);
    if (!selectedDate) {
      return res.status(400).json({ message: "Invalid date provided." });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Cannot book in the past (yesterday or earlier)
    if (selectedDate < today) {
      return res
        .status(400)
        .json({ message: "You cannot book an appointment in the past." });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: "Donor not found." });
    }

    // Prevent multiple concurrent SCHEDULED appointments (back-to-back booking bypass)
    const activeScheduled = await DonationAppointment.findOne({
      donor: user._id,
      status: "SCHEDULED",
    });
    if (activeScheduled) {
      return res.status(400).json({
        message:
          "You already have a scheduled donation appointment. Please complete or cancel it before booking another.",
      });
    }

    // Resolve freshest nextEligibleDate and evaluate eligibility for selectedDate
    const nextEligibleDate = await resolveNextEligibleDate(user);
    const { eligible, reasons } = buildEligibility(
      user,
      nextEligibleDate,
      selectedDate
    );

    if (!eligible) {
      return res.status(400).json({
        message:
          reasons.join(" ") ||
          "You are currently not eligible to book a donation appointment.",
      });
    }

    const appointment = await DonationAppointment.create({
      donor: user._id,
      location: location._id,
      date: selectedDate,
      timeSlot,
      status: "SCHEDULED",
    });

    const populated = await appointment.populate("location", "name city");

    // Create notification for booked appointment
    try {
      await Notification.create({
        user: user._id,
        role: "DONOR",
        type: "APPOINTMENT_BOOKED",
        title: "Donation appointment booked",
        message: `Your appointment at ${location.name} on ${selectedDate.toLocaleDateString()} at ${timeSlot} has been booked.`,
        meta: {
          appointmentId: appointment._id,
          locationName: location.name,
          date: appointment.date,
          timeSlot,
        },
      });
    } catch (notifyErr) {
      console.error("Failed to create booking notification:", notifyErr);
    }

    res.status(201).json({ appointment: serializeAppointment(populated) });
  } catch (err) {
    console.error("createDonationAppointment error:", err);
    next(err);
  }
};

// PATCH /api/donor/appointments/:id/cancel
exports.cancelDonationAppointment = async (req, res, next) => {
  try {
    const { id } = req.params;

    const appointment = await DonationAppointment.findOne({
      _id: id,
      donor: req.user._id,
    }).populate("location", "name city");

    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found." });
    }

    if (appointment.status !== "SCHEDULED") {
      return res.status(400).json({
        message: "Only scheduled appointments can be cancelled.",
      });
    }

    appointment.status = "CANCELLED";
    await appointment.save();

    try {
      await Notification.create({
        user: req.user._id,
        role: "DONOR",
        type: "APPOINTMENT_CANCELLED",
        title: "Donation appointment cancelled",
        message: `Your appointment at ${
          appointment.location?.name || "the blood bank"
        } on ${appointment.date.toLocaleDateString()} has been cancelled.`,
        meta: {
          appointmentId: appointment._id,
          locationName: appointment.location?.name,
          date: appointment.date,
          timeSlot: appointment.timeSlot,
        },
      });
    } catch (notifyErr) {
      console.error("Failed to create cancel notification:", notifyErr);
    }

    res.json({ appointment: serializeAppointment(appointment) });
  } catch (err) {
    console.error("cancelDonationAppointment error:", err);
    next(err);
  }
};

// GET /api/donor/donations?status=COMPLETED|CANCELLED|ALL
exports.getDonationHistory = async (req, res, next) => {
  try {
    const rawStatus = (req.query.status || "COMPLETED").toUpperCase();

    let statuses;
    if (rawStatus === "ALL") {
      statuses = ["COMPLETED", "CANCELLED"];
    } else if (rawStatus === "CANCELLED") {
      statuses = ["CANCELLED"];
    } else {
      statuses = ["COMPLETED"];
    }

    const donations = await DonationAppointment.find({
      donor: req.user._id,
      status: { $in: statuses },
    })
      .sort({ date: -1 })
      .populate("location", "name city")
      .exec();

    const mapped = donations.map(serializeAppointment);

    res.json({ donations: mapped });
  } catch (err) {
    console.error("getDonationHistory error:", err);
    next(err);
  }
};

// GET /api/donor/profile
exports.getDonorProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: "Donor not found." });
    }
    res.json({ user: sanitizeUserDoc(user) });
  } catch (err) {
    console.error("getDonorProfile error:", err);
    next(err);
  }
};

// PUT /api/donor/profile
exports.updateDonorProfile = async (req, res, next) => {
  try {
    const { name, phone, gender, cnic, age, weight, healthCondition } = req.body;

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: "Donor not found." });
    }

    if (typeof name === "string" && name.trim()) user.name = name.trim();
    if (typeof phone === "string") user.phone = phone.trim();
    if (typeof gender === "string") user.gender = gender;
    if (typeof cnic === "string") user.cnic = cnic.trim();
    if (typeof healthCondition === "string")
      user.healthCondition = healthCondition.trim();

    if (age !== undefined && age !== null && age !== "") {
      const ageNum = Number(age);
      if (Number.isNaN(ageNum) || ageNum < 1 || ageNum > 120) {
        return res
          .status(400)
          .json({ message: "Age must be a valid number between 1 and 120." });
      }
      user.age = ageNum;
    }

    if (weight !== undefined && weight !== null && weight !== "") {
      const weightNum = Number(weight);
      if (Number.isNaN(weightNum) || weightNum < 1 || weightNum > 300) {
        return res
          .status(400)
          .json({ message: "Weight must be a valid number between 1 and 300 kg." });
      }
      user.weight = weightNum;
    }

    await user.save();

    res.json({ user: sanitizeUserDoc(user) });
  } catch (err) {
    console.error("updateDonorProfile error:", err);
    next(err);
  }
};

// PUT /api/donor/change-password
exports.changeDonorPassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res
        .status(400)
        .json({ message: "Current and new password are required." });
    }

    if (newPassword.length < 8) {
      return res
        .status(400)
        .json({ message: "New password must be at least 8 characters." });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: "Donor not found." });
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
    console.error("changeDonorPassword error:", err);
    next(err);
  }
};

// GET /api/donor/notifications?onlyUnread=true
exports.getDonorNotifications = async (req, res, next) => {
  try {
    const onlyUnread =
      String(req.query.onlyUnread || "").toLowerCase() === "true";

    const filter = {
      user: req.user._id,
      role: "DONOR",
    };

    if (onlyUnread) {
      filter.isRead = false;
    }

    const notifications = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    res.json({ notifications });
  } catch (err) {
    console.error("getDonorNotifications error:", err);
    next(err);
  }
};

// PATCH /api/donor/notifications/:id/read
exports.markNotificationRead = async (req, res, next) => {
  try {
    const { id } = req.params;

    const notif = await Notification.findOneAndUpdate(
      { _id: id, user: req.user._id, role: "DONOR" },
      { $set: { isRead: true } },
      { new: true }
    ).lean();

    if (!notif) {
      return res.status(404).json({ message: "Notification not found." });
    }

    res.json({ notification: notif });
  } catch (err) {
    console.error("markNotificationRead error:", err);
    next(err);
  }
};

// PATCH /api/donor/notifications/mark-all-read
exports.markAllNotificationsRead = async (req, res, next) => {
  try {
    const result = await Notification.updateMany(
      { user: req.user._id, role: "DONOR", isRead: false },
      { $set: { isRead: true } }
    );

    res.json({
      updatedCount:
        result.modifiedCount !== undefined
          ? result.modifiedCount
          : result.nModified || 0,
    });
  } catch (err) {
    console.error("markAllNotificationsRead error:", err);
    next(err);
  }
};

// Export helpers for unit testing
exports._buildEligibility = buildEligibility;
