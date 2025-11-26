const bcrypt = require("bcrypt");
const DonationAppointment = require("../models/DonationAppointment");
const BloodBankLocation = require("../models/BloodBankLocation");
const User = require("../models/User");
const Notification = require("../models/Notification");


const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

function sanitizeUserDoc(userDoc) {
  const obj = userDoc.toObject();
  delete obj.passwordHash;
  delete obj.__v;
  return obj;
}

function buildEligibility(user, nextEligibleDate) {
  const reasons = [];
  let eligible = true;

  if (user.age && user.age < 18) {
    eligible = false;
    reasons.push("You must be at least 18 years old to donate.");
  }

  if (user.age && user.age > 70) {
    eligible = false;
    reasons.push("Maximum donation age is 70 years.");
  }

  if (user.weight && user.weight < 40) {
    eligible = false;
    reasons.push("Weight must be at least 40 kg to donate.");
  }

  if (nextEligibleDate) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const next = new Date(nextEligibleDate);
    next.setHours(0, 0, 0, 0);

    if (next > today) {
      eligible = false;
      reasons.push(
        `You can donate again after ${next.toLocaleDateString()} based on your last donation.`
      );
    }
  }

  return { eligible, reasons };
}

// Serialize appointment / donation for frontend
function serializeAppointment(doc) {
  const obj = doc.toObject({ virtuals: false });
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

    let nextEligibleDate = user.nextEligibleDonationDate || null;

    if (!nextEligibleDate) {
      const lastDonation = await DonationAppointment.findOne({
        donor: userId,
        status: "COMPLETED",
      })
        .sort({ date: -1 })
        .lean();

      if (lastDonation && lastDonation.date) {
        const d = new Date(lastDonation.date);
        d.setDate(d.getDate() + 56);
        nextEligibleDate = d;
        user.nextEligibleDonationDate = d;
        await user.save();
      }
    }

    const { eligible, reasons } = buildEligibility(user, nextEligibleDate);

    const [totalCompleted, upcomingAppointments] = await Promise.all([
      DonationAppointment.countDocuments({
        donor: userId,
        status: "COMPLETED",
      }),
      DonationAppointment.countDocuments({
        donor: userId,
        status: "SCHEDULED",
        date: { $gte: new Date() },
      }),
    ]);

    const overview = {
      eligibility: { eligible, reasons },
      nextEligibleDonationDate: nextEligibleDate,
      stats: {
        totalDonations: totalCompleted,
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

    const locations = await BloodBankLocation.find({ isActive: true }).lean();

    const mapped = locations.map((loc) => {
      const inv = (loc.inventory || []).find(
        (i) => i.bloodType === userBloodType
      );

      let fill = null;
      if (inv && inv.capacity) {
        fill = inv.units / inv.capacity;
      }

      let stockLevel = "MEDIUM";
      let isRecommended = false;

      if (fill === null) {
        stockLevel = "MEDIUM";
      } else if (fill < 0.4) {
        stockLevel = "LOW";
        isRecommended = true;
      } else if (fill < 0.75) {
        stockLevel = "MEDIUM";
      } else {
        stockLevel = "HIGH";
      }

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
    if (!location) {
      return res.status(404).json({ message: "Blood bank not found." });
    }

    // Parse and normalise selected date
    const selectedDate = new Date(date);
    if (Number.isNaN(selectedDate.getTime())) {
      return res.status(400).json({ message: "Invalid date provided." });
    }
    selectedDate.setHours(0, 0, 0, 0);

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

    // ---- Eligibility for this specific appointment date ----
    const reasons = [];
    let eligible = true;

    // Basic health checks
    if (user.age && user.age < 18) {
      eligible = false;
      reasons.push("You must be at least 18 years old to donate.");
    }

    if (user.age && user.age > 70) {
      eligible = false;
      reasons.push("Maximum donation age is 70 years.");
    }

    if (user.weight && user.weight < 40) {
      eligible = false;
      reasons.push("Weight must be at least 40 kg to donate.");
    }

    // Figure out the next eligible donation date
    let nextEligibleDate = user.nextEligibleDonationDate || null;

    if (!nextEligibleDate) {
      const lastDonation = await DonationAppointment.findOne({
        donor: user._id,
        status: "COMPLETED",
      })
        .sort({ date: -1 })
        .lean();

      if (lastDonation && lastDonation.date) {
        const d = new Date(lastDonation.date);
        d.setDate(d.getDate() + 56); // 8-week gap
        nextEligibleDate = d;
        user.nextEligibleDonationDate = d;
        await user.save();
      }
    }

    // Now compare *selectedDate* vs nextEligibleDate (not vs today)
    if (nextEligibleDate) {
      const next = new Date(nextEligibleDate);
      next.setHours(0, 0, 0, 0);

      if (selectedDate < next) {
        eligible = false;
        reasons.push(
          `You can only book an appointment on or after ${next.toLocaleDateString()} based on your last donation.`
        );
      }
    }

    if (!eligible) {
      return res.status(400).json({
        message:
          reasons.join(" ") ||
          "You are currently not eligible to book a donation appointment.",
      });
    }

    // Prevent duplicate SCHEDULED appointment at same time slot
    const existing = await DonationAppointment.findOne({
      donor: user._id,
      date: selectedDate,
      timeSlot,
      status: { $in: ["SCHEDULED"] },
    });
    if (existing) {
      return res.status(400).json({
        message: "You already have an appointment at this date and time.",
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
    // Notification for cancelled appointment
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
    const {
      name,
      phone,
      gender,
      cnic,
      age,
      weight,
      healthCondition,
      // bloodType, // optionally allow later
    } = req.body;

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
      if (!Number.isNaN(ageNum) && ageNum > 0 && ageNum < 120) {
        user.age = ageNum;
      }
    }

    if (weight !== undefined && weight !== null && weight !== "") {
      const weightNum = Number(weight);
      if (!Number.isNaN(weightNum) && weightNum > 0 && weightNum < 300) {
        user.weight = weightNum;
      }
    }

    // If you want donors to change bloodType, uncomment and validate:
    // if (bloodType && BLOOD_TYPES.includes(bloodType)) {
    //   user.bloodType = bloodType;
    // }

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

