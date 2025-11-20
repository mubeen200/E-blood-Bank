const { Schema, model } = require("mongoose");

const appointmentSchema = new Schema(
  {
    donor: { type: Schema.Types.ObjectId, ref: "User", required: true },
    location: { type: Schema.Types.ObjectId, ref: "Location", required: true },
    date: { type: Date, required: true },
    status: {
      type: String,
      enum: ["BOOKED", "CANCELLED", "COMPLETED"],
      default: "BOOKED"
    }
  },
  { timestamps: true }
);

module.exports = model("Appointment", appointmentSchema);
