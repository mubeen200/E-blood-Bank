require("dotenv").config();
const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const morgan = require("morgan");

const connectDB = require("./config/db");
const { errorHandler } = require("./middleware/errorHandler");
const seedAdmin = require("./utils/seedAdmin");

const authRoutes = require("./routes/authRoutes");
const donorRoutes = require("./routes/donorRoutes");

const app = express();

// Connect DB & seed admin
connectDB()
  .then(async () => {
    await seedAdmin();
    console.log("MongoDB connected");
    app.listen(PORT, () =>
      console.log(`Server running on http://localhost:${PORT}`)
    );
  })
  .catch((err) => {
    console.error("DB connection failed", err);
    process.exit(1);
  });


// Middleware
app.use(
  cors({
    origin: ["http://localhost:5173", "http://localhost:5174"],
    credentials: true,
  })
);

app.use(express.json());
app.use(cookieParser());
app.use(morgan("dev"));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/donor", donorRoutes);

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// Error handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
