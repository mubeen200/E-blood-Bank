const { Schema, model } = require("mongoose");

const donationSchema = new Schema(
  {
    donor: { type: Schema.Types.ObjectId, ref: "User", required: true },
    location: { type: Schema.Types.ObjectId, ref: "Location", required: true },
    bloodType: { type: String, required: true },
    units: { type: Number, required: true, min: 1 },
    date: { type: Date, default: Date.now },

    // completed / rejected / pending (for history status display)
    status: {
      type: String,
      enum: ["COMPLETED", "REJECTED", "PENDING"],
      default: "COMPLETED"
    }
  },
  { timestamps: true }
);

module.exports = model("Donation", donationSchema);
