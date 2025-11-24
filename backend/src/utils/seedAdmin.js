const bcrypt = require("bcrypt");
const User = require("../models/User");

async function seedAdmin() {
  try {
    const existing = await User.findOne({ role: "ADMIN" });
    if (existing) return;

    const email = process.env.ADMIN_EMAIL || "admin@ebloodbank.com";
    const password = process.env.ADMIN_PASSWORD || "Admin123!";

    const passwordHash = await bcrypt.hash(password, 10);

    await User.create({
      name: "System Admin",
      email,
      passwordHash,
      role: "ADMIN",
    });

    console.log(`Admin user created: ${email} / ${password}`);
  } catch (err) {
    console.error("seedAdmin error", err);
  }
}

module.exports = seedAdmin;
