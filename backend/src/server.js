require("dotenv").config();
const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const donorRoutes = require("./routes/donorRoutes");
const recipientRoutes = require("./routes/recipientRoutes");
const seedAdmin = require("./utils/seedAdmin");
const adminRoutes = require("./routes/adminRoutes");
const { errorHandler } = require("./middleware/errorHandler");


const app = express();

app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  })
);

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/donor", donorRoutes);
app.use("/api/recipient", recipientRoutes);
app.use("/api/admin", adminRoutes);

// Basic health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// Global error handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

connectDB()
  .then(seedAdmin)
  .then(() => {
    app.listen(PORT, () =>
      console.log(`API server running on http://localhost:${PORT}`)
    );
  })
  .catch((err) => {
    console.error("Failed to start server", err);
    process.exit(1);
  });
