const { Schema, model } = require("mongoose");

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    passwordHash: { type: String, required: true },

    phone: { type: String },
    gender: { type: String }, // "Male", "Female", "Other"
    cnic: { type: String },

    role: {
      type: String,
      enum: ["ADMIN", "DONOR", "RECIPIENT"],
      required: true,
    },

    bloodType: {
      type: String,
      enum: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"],
      required: function () {
        return this.role !== "ADMIN";
      },
    },

    // Donor-specific
    age: { type: Number },
    weight: { type: Number },
    healthCondition: { type: String },

    nextEligibleDonationDate: { type: Date },
    totalDonations: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = model("User", userSchema);
