const jwt = require("jsonwebtoken");
const User = require("../models/User");

const getTokenFromReq = (req) => {
  if (req.cookies && req.cookies.token) return req.cookies.token;
  const auth = req.headers.authorization;
  if (auth && auth.startsWith("Bearer ")) {
    return auth.split(" ")[1];
  }
  return null;
};

exports.auth = async (req, res, next) => {
  const token = getTokenFromReq(req);
  if (!token) return res.status(401).json({ message: "Not authenticated" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "devsecret");
    const user = await User.findById(decoded.id);
    if (!user) return res.status(401).json({ message: "User not found" });
    req.user = user;
    next();
  } catch (err) {
    console.error("Auth error", err.message);
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

exports.requireRole = (role) => {
  return (req, res, next) => {
    if (!req.user || req.user.role !== role) {
      return res.status(403).json({ message: "Forbidden" });
    }
    next();
  };
};
