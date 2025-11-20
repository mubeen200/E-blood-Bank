const { Schema, model } = require("mongoose");

const inventorySchema = new Schema(
  {
    "A+": { type: Number, default: 0 },
    "A-": { type: Number, default: 0 },
    "B+": { type: Number, default: 0 },
    "B-": { type: Number, default: 0 },
    "AB+": { type: Number, default: 0 },
    "AB-": { type: Number, default: 0 },
    "O+": { type: Number, default: 0 },
    "O-": { type: Number, default: 0 }
  },
  { _id: false }
);

const locationSchema = new Schema(
  {
    name: { type: String, required: true },
    address: { type: String },
    city: { type: String },
    contactNumber: { type: String },
    inventory: { type: inventorySchema, default: () => ({}) }
  },
  { timestamps: true }
);

module.exports = model("Location", locationSchema);
