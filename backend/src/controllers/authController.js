const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const JWT_SECRET = process.env.JWT_SECRET || "devsecret";

const signToken = (user) =>
  jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, {
    expiresIn: "7d",
  });

const sendAuthCookie = (res, token) => {
  res.cookie("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
};

const sanitizeUser = (userDoc) => {
  const obj = userDoc.toObject();
  delete obj.passwordHash;
  delete obj.__v;
  return obj;
};

// POST /api/auth/register-donor
exports.registerDonor = async (req, res) => {
  console.log("➡️  /api/auth/register-donor body:", req.body);

  try {
    const {
      name,
      email,
      password,
      phone,
      gender,
      cnic,
      bloodType,
      age,
      weight,
      healthCondition,
    } = req.body;

    if (!name || !email || !password || !bloodType) {
      return res.status(400).json({
        message: "Name, email, password and blood type are required.",
      });
    }

    if (password.length < 6) {
      return res
        .status(400)
        .json({ message: "Password must be at least 6 characters long." });
    }

    // Age numeric but optional
    let ageNum;
    if (age !== undefined && age !== null && age !== "") {
      ageNum = Number(age);
      if (Number.isNaN(ageNum) || ageNum < 18 || ageNum > 70) {
        return res.status(400).json({
          message: "Age must be a number between 18 and 70.",
        });
      }
    }

    // Weight numeric but optional
    let weightNum;
    if (weight !== undefined && weight !== null && weight !== "") {
      weightNum = Number(weight);
      if (Number.isNaN(weightNum) || weightNum < 40) {
        return res.status(400).json({
          message: "Weight must be a number of at least 40 kg.",
        });
      }
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ message: "Email already registered." });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      passwordHash,
      phone,
      gender,
      cnic,
      bloodType,
      age: ageNum,
      weight: weightNum,
      healthCondition,
      role: "DONOR",
    });

    const token = signToken(user);
    sendAuthCookie(res, token);

    console.log("✅ Donor created:", user._id.toString());

    res.status(201).json({ user: sanitizeUser(user) });
  } catch (err) {
    console.error("❌ registerDonor error:", err);

    if (err.code === 11000 && err.keyPattern && err.keyPattern.email) {
      return res.status(400).json({ message: "Email already registered." });
    }

    res.status(500).json({
      message: "Server error while registering donor.",
      // You can temporarily expose details while debugging;
      // remove in production.
      error: err.message,
    });
  }
};

// POST /api/auth/register-recipient
exports.registerRecipient = async (req, res, next) => {
  try {
    const { name, email, password, phone, gender, cnic, bloodType } = req.body;

    if (!name || !email || !password || !bloodType) {
      return res
        .status(400)
        .json({ message: "Name, email, password and blood type are required." });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ message: "Email already registered." });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      passwordHash,
      phone,
      gender,
      cnic,
      bloodType,
      role: "RECIPIENT",
    });

    const token = signToken(user);
    sendAuthCookie(res, token);

    res.status(201).json({ user: sanitizeUser(user) });
  } catch (err) {
    console.error("registerRecipient error", err);
    next(err);
  }
};

// POST /api/auth/login
// body: { email, password, role? }
// POST /api/auth/login
// body: { email, password, role? }
exports.login = async (req, res, next) => {
  try {
    console.log("🔐 /api/auth/login body:", req.body);

    const { email, password, role } = req.body;

    if (!email || !password) {
      console.log("⛔ Missing email or password");
      return res
        .status(400)
        .json({ message: "Email and password are required." });
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    // Find user ONLY by email (we'll *optionally* compare role later)
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      console.log("⛔ No user found for email:", normalizedEmail);
      return res
        .status(400)
        .json({ message: "Incorrect email or password.", code: "NO_USER" });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      console.log("⛔ Invalid password for:", normalizedEmail);
      return res
        .status(400)
        .json({ message: "Incorrect email or password.", code: "BAD_PASSWORD" });
    }

    // OPTIONAL – if frontend sends role, we check for mismatch
    if (role && role !== user.role) {
      console.log(
        `⚠️ Role mismatch when logging in: client=${role}, actual=${user.role} for ${normalizedEmail}`
      );
      return res.status(400).json({
        message: `This account is registered as ${user.role}, but you selected ${role}.`,
        code: "ROLE_MISMATCH",
        actualRole: user.role,
      });
    }

    // Use the same helpers you already have
    const token = signToken(user);
    sendAuthCookie(res, token);

    console.log("✅ Login success for", normalizedEmail, "role:", user.role);

    return res.json({ user: sanitizeUser(user) });
  } catch (err) {
    console.error("Login error:", err);
    next(err);
  }
};





// POST /api/auth/logout
exports.logout = async (req, res) => {
  res.clearCookie("token");
  res.json({ message: "Logged out." });
};

// GET /api/auth/me
exports.getMe = async (req, res) => {
  res.json({ user: sanitizeUser(req.user) });
};
