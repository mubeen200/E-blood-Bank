const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const signToken = (user) => {
  const payload = { id: user._id, role: user.role };
  return jwt.sign(payload, process.env.JWT_SECRET || "devsecret", {
    expiresIn: "7d",
  });
};

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
    const { email, password, role } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required." });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Invalid email or password." });
    }

    // Optional: make sure selected role matches stored role
    if (role && role !== user.role) {
      return res
        .status(400)
        .json({ message: `This account is not a ${role.toLowerCase()}.` });
    }

    // ✅ Password check – support `passwordHash` (new) and `password` (old)
    let valid = false;

    if (user.passwordHash) {
      valid = await bcrypt.compare(password, user.passwordHash);
    } else if (user.password) {
      // in case old docs stored bcrypt hash in `password`
      valid = await bcrypt.compare(password, user.password);
    }

    if (!valid) {
      return res.status(400).json({ message: "Invalid email or password." });
    }

    const token = signToken(user);
    sendAuthCookie(res, token);

    res.json({ user: sanitizeUser(user) });
  } catch (err) {
    console.error("login error", err);
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
