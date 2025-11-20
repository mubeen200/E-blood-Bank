const { Schema, model } = require("mongoose");

const bloodInventorySchema = new Schema(
  {
    bloodType: {
      type: String,
      enum: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"],
      required: true,
    },
    units: {
      type: Number,
      default: 0,
      min: 0,
    },
    capacity: {
      type: Number,
      default: 50,
      min: 1,
    },
  },
  { _id: false }
);

const bloodBankLocationSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    city: { type: String, trim: true },
    address: { type: String, trim: true },
    phone: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
    // Inventory per blood type
    inventory: [bloodInventorySchema],
  },
  { timestamps: true }
);

module.exports = model("BloodBankLocation", bloodBankLocationSchema);
