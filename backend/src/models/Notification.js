const { Schema, model, Types } = require("mongoose");

const notificationSchema = new Schema(
  {
    user: {
      type: Types.ObjectId,
      ref: "User",
      required: true,
    },

    role: {
      type: String,
      enum: ["ADMIN", "DONOR", "RECIPIENT"],
      required: true,
    },

    // Broadened enum to include recipient request types as well
    type: {
      type: String,
      enum: [
        "APPOINTMENT_BOOKED",
        "APPOINTMENT_CANCELLED",
        "DONATION_COMPLETED",
        "MATCHING_REQUEST",
        "SYSTEM",
        "REQUEST",            // 👈 normal blood request
        "EMERGENCY_REQUEST",  // 👈 emergency blood request
      ],
      default: "SYSTEM",
    },

    title: {
      type: String,
      required: true,
    },

    message: {
      type: String,
      required: true,
    },

    // Optional deep-link into the app (e.g. "/recipient/requests")
    link: {
      type: String,
    },

    // Flexible metadata (requestId, locationId, urgency, etc.)
    meta: {
      type: Schema.Types.Mixed,
    },

    isRead: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = model("Notification", notificationSchema);
