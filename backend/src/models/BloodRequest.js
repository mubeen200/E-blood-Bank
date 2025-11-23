const { Schema, model } = require("mongoose");

const bloodRequestSchema = new Schema(
  {
    recipient: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    location: {
      type: Schema.Types.ObjectId,
      ref: "Location",
      required: true,
    },
    bloodType: {
      type: String,
      enum: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"],
      required: true,
    },
    units: { type: Number, required: true, min: 1 },

    urgency: {
      type: String,
      enum: ["LOW", "MEDIUM", "HIGH"],
      default: "MEDIUM",
    },

    reason: { type: String },

    status: {
      type: String,
      enum: ["PENDING", "APPROVED", "FULFILLED", "REJECTED", "CANCELLED"],
      default: "PENDING",
    },

    fulfilledAt: { type: Date },
  },
  { timestamps: true }
);

module.exports = model("BloodRequest", bloodRequestSchema, "requests");
