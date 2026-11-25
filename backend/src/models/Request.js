// backend/src/models/Request.js
const { Schema, model } = require("mongoose");

const requestSchema = new Schema(
  {
    recipient: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    bloodType: {
      type: String,
      enum: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"],
      required: true,
    },

    units: {
      type: Number,
      required: true,
      min: 1,
    },

    urgency: {
      type: String,
      enum: ["LOW", "MEDIUM", "HIGH"],
      default: "MEDIUM",
    },

    reason: {
      type: String,
    },

    location: {
      type: Schema.Types.ObjectId,
      ref: "BloodBankLocation",
      required: true,
    },

    status: {
      type: String,
      enum: ["PENDING", "APPROVED", "FULFILLED", "REJECTED", "CANCELLED"],
      default: "PENDING",
    },

    fulfilledAt: {
      type: Date,
    },

    // 🚨 Emergency-related fields
    isEmergency: {
      type: Boolean,
      default: false,
    },

    // Where the patient is / was when raising the emergency
    currentLocation: {
      type: String,
    },

    // Contact number to reach the requester / attendant quickly
    contactPhone: {
      type: String,
    },
  },
  { timestamps: true }
);

module.exports = model("Request", requestSchema);
