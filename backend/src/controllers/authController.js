const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { BLOOD_TYPES } = require("../utils/inventoryHelper");

// Cross-site cookies (Vercel <-> Render) require secure + sameSite: "none" in production,
// while local HTTP dev requires secure: false + sameSite: "lax".
const isProd =
  process.env.NODE_ENV === "production" || Boolean(process.env.RENDER);
const JWT_SECRET = process.env.JWT_SECRET || "devsecret";

const cookieOptions = {
  httpOnly: true,
  secure: isProd,
  sameSite: isProd ? "none" : "lax",
  path: "/",
};

const signToken = (user) =>
  jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, {
    expiresIn: "7d",
  });

const sendAuthCookie = (res, token) => {
  res.cookie("token", token, cookieOptions);
};

const sanitizeUser = (userDoc) => {
  const obj = userDoc.toObject();
  delete obj.passwordHash;
  delete obj.__v;
  return obj;
};

// POST /api/auth/register-donor
exports.registerDonor = async (req, res, next) => {
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

    if (!BLOOD_TYPES.includes(bloodType)) {
      return res.status(400).json({
        message: "Invalid blood type.",
      });
    }

    if (String(password).length < 6) {
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

    const normalizedEmail = String(email).trim().toLowerCase();
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(400).json({ message: "Email already registered." });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await User.create({
      name: String(name).trim(),
      email: normalizedEmail,
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

    return res.status(201).json({ user: sanitizeUser(user) });
  } catch (err) {
    console.error("registerDonor error:", err);
    if (err.code === 11000 && err.keyPattern && err.keyPattern.email) {
      return res.status(400).json({ message: "Email already registered." });
    }
    return next(err);
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

    if (!BLOOD_TYPES.includes(bloodType)) {
      return res.status(400).json({ message: "Invalid blood type." });
    }

    if (String(password).length < 6) {
      return res
        .status(400)
        .json({ message: "Password must be at least 6 characters long." });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(400).json({ message: "Email already registered." });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await User.create({
      name: String(name).trim(),
      email: normalizedEmail,
      passwordHash,
      phone,
      gender,
      cnic,
      bloodType,
      role: "RECIPIENT",
    });

    const token = signToken(user);
    sendAuthCookie(res, token);

    return res.status(201).json({ user: sanitizeUser(user) });
  } catch (err) {
    console.error("registerRecipient error", err);
    return next(err);
  }
};

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

    const normalizedEmail = String(email).trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res
        .status(400)
        .json({ message: "Incorrect email or password.", code: "NO_USER" });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return res
        .status(400)
        .json({ message: "Incorrect email or password.", code: "BAD_PASSWORD" });
    }

    if (role && role !== user.role) {
      return res.status(400).json({
        message: `This account is registered as ${user.role}, but you selected ${role}.`,
        code: "ROLE_MISMATCH",
        actualRole: user.role,
      });
    }

    const token = signToken(user);
    sendAuthCookie(res, token);

    return res.json({ user: sanitizeUser(user) });
  } catch (err) {
    console.error("Login error:", err);
    return next(err);
  }
};

// POST /api/auth/logout
exports.logout = async (req, res) => {
  res.clearCookie("token", cookieOptions);
  return res.json({ message: "Logged out." });
};

// GET /api/auth/me
exports.getMe = async (req, res) => {
  res.json({ user: sanitizeUser(req.user) });
};
