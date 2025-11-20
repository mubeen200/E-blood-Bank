const { Schema, model } = require("mongoose");

const requestSchema = new Schema(
  {
    recipient: { type: Schema.Types.ObjectId, ref: "User", required: true },
    location: { type: Schema.Types.ObjectId, ref: "Location", required: true },
    bloodType: { type: String, required: true },
    units: { type: Number, required: true, min: 1 },
    urgency: {
      type: String,
      enum: ["LOW", "MEDIUM", "HIGH"],
      required: true
    },
    status: {
      type: String,
      enum: ["PENDING", "COMPLETED", "CANCELLED"],
      default: "PENDING"
    },
    reservedDate: { type: Date }
  },
  { timestamps: true }
);

module.exports = model("Request", requestSchema);
