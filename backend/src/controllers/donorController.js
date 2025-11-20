const DonationAppointment = require("../models/DonationAppointment");
const BloodBankLocation = require("../models/BloodBankLocation");
const User = require("../models/User");

const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

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

// Serialize appointment for frontend
function serializeAppointment(doc) {
  const obj = doc.toObject({ virtuals: false });
  const location = obj.location;

  return {
    _id: obj._id,
    date: obj.date,
    timeSlot: obj.timeSlot,
    status: obj.status,
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

    // Derive from last completed donation if not set
    if (!nextEligibleDate) {
      const lastDonation = await DonationAppointment.findOne({
        donor: userId,
        status: "COMPLETED",
      })
        .sort({ date: -1 })
        .lean();

      if (lastDonation && lastDonation.date) {
        const d = new Date(lastDonation.date);
        d.setDate(d.getDate() + 56); // 8 weeks cooldown
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
        distanceKm: loc.distanceKm, // optional field for later
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
// body: { locationId, date: 'YYYY-MM-DD', timeSlot }
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

    const selectedDate = new Date(date);
    if (Number.isNaN(selectedDate.getTime())) {
      return res.status(400).json({ message: "Invalid date provided." });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    selectedDate.setHours(0, 0, 0, 0);

    if (selectedDate < today) {
      return res
        .status(400)
        .json({ message: "You cannot book an appointment in the past." });
    }

    // Eligibility re-check
    const user = await User.findById(req.user._id);
    const { eligible, reasons } = buildEligibility(
      user,
      user.nextEligibleDonationDate
    );
    if (!eligible) {
      return res.status(400).json({
        message:
          reasons.join(" ") ||
          "You are currently not eligible to book a donation appointment.",
      });
    }

    // prevent double booking at same date/time
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

    res.json({ appointment: serializeAppointment(appointment) });
  } catch (err) {
    console.error("cancelDonationAppointment error:", err);
    next(err);
  }
};
