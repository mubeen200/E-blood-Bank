const { Schema, model, Types } = require("mongoose");

const donationAppointmentSchema = new Schema(
  {
    donor: {
      type: Types.ObjectId,
      ref: "User",
      required: true,
    },
    location: {
      type: Types.ObjectId,
      ref: "BloodBankLocation",
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    timeSlot: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ["SCHEDULED", "COMPLETED", "CANCELLED"],
      default: "SCHEDULED",
    },
    unitsDonated: {
      type: Number,
      min: 0,
    },
  },
  { timestamps: true }
);

module.exports = model("DonationAppointment", donationAppointmentSchema);
