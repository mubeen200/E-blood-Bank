// Simple global error handler that always returns JSON with { message }
exports.errorHandler = (err, req, res, next) => {
  console.error("ERROR:", err);

  // Mongoose validation error
  if (err.name === "ValidationError") {
    const messages = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({ message: messages.join(" ") });
  }

  // Invalid MongoDB ObjectId
  if (err.name === "CastError") {
    return res.status(400).json({ message: `Invalid ${err.path || "ID"} format.` });
  }

  // Duplicate key (e.g. unique email)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || "field";
    return res
      .status(400)
      .json({ message: `A record with this ${field} already exists.` });
  }

  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal server error.";

  res.status(status).json({ message });
};
