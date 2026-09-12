require("dotenv").config();
const express = require("express");
const http = require("http");
const hpp = require("hpp");
const { initSocket } = require("./socket");

/* ── Environment validator ──────────────────────────────────────
   Call before anything else so the process exits fast with a clear
   error message if a required secret is absent.
   ─────────────────────────────────────────────────────────────── */
function validateEnv() {
  const REQUIRED = [
    "MONGO_URI",
    "JWT_SECRET",        // or JWT_ACCESS_SECRET
    "INVITE_SECRET",
  ];

  // These are warned about but don't hard-stop in dev (Cloudinary / email may be optional)
  const WARN_ONLY = [
    "CLIENT_URL",
    "CLOUDINARY_CLOUD_NAME",
    "CLOUDINARY_API_KEY",
    "CLOUDINARY_API_SECRET",
    "GITHUB_CLIENT_ID",
    "GITHUB_CLIENT_SECRET",
    "GITHUB_WEBHOOK_SECRET",
    "GITHUB_ENCRYPTION_KEY",
    "SERVER_URL",
  ];

  const missing = REQUIRED.filter(k => !process.env[k]);
  if (missing.length) {
    console.error("\n[ENV] ❌  Missing required environment variables:");
    missing.forEach(k => console.error(`       • ${k}`));
    console.error("       Add them to backend/.env and restart.\n");
    process.exit(1);
  }

  const warnMissing = WARN_ONLY.filter(k => !process.env[k]);
  if (warnMissing.length) {
    console.warn("\n[ENV] ⚠️  Optional env vars not set (some features may be disabled):");
    warnMissing.forEach(k => console.warn(`       • ${k}`));
    console.warn("");
  }
}

validateEnv();

/* ── Express + HTTP server ──────────────────────────────────────*/
const app = express();
const httpServer = http.createServer(app);

/* ── Socket.IO (must init before routes) ───────────────────────*/
const io = initSocket(httpServer);
app.set("io", io);  // make io available to controllers via req.app.get("io")

const { helmetMiddleware, generalLimiter, mongoSanitizeMiddleware, xssMiddleware, authLimiter, corsMiddleware } = require("./middleware/securityMiddleware");
console.log({
  helmetMiddleware,
  generalLimiter,
  mongoSanitizeMiddleware,
  xssMiddleware,
  authLimiter,
  corsMiddleware
});

/* 1. helmet */
app.use(helmetMiddleware);

/* 2. rate-limit (general) */
app.use("/api", generalLimiter);

/* 3. hpp */
app.use(hpp());

/* 4. cors */
app.use(corsMiddleware);

/* 5. sanitizers (mongo + xss) */
app.use(mongoSanitizeMiddleware);
app.use(xssMiddleware);

/* 6. express.json (Body parsers) */
app.use(express.json({ limit: "10mb" }));

/* 7. express.urlencoded */
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

/* ── Database ──────────────────────────────────────────────────*/
const ConnectDB = require("./config/db");
ConnectDB();

/* ── SMTP verification (non-blocking) ─────────────────────────*/
const { verifySmtp } = require("./utils/emailService");
verifySmtp();

/* ── Standup digest cron (non-blocking) ───────────────────────*/
const { startStandupDigest } = require("./utils/standupDigest");
startStandupDigest();

const { protect } = require("./middleware/authmiddleware");

app.get("/", (req, res) => res.send("DevSpace API running ✓"));

/* ── Auth routes — auth-specific rate limiter (10 req / 15 min) */
const authRoutes = require("./routes/authRoutes");
app.use("/api/auth", authLimiter, authRoutes);

app.get("/api/protected", protect, (req, res) => {
  res.json({ message: "Protected route accessed", user: req.user });
});

/* ── Workspaces ─────────────────────────────────────────────── */
const workspaceRoutes = require("./routes/workspaceRoutes");
app.use("/api/workspaces", workspaceRoutes);

/* ── Projects ────────────────────────────────────────────────── */
const projectRoutes = require("./routes/projectRoutes");
app.use("/api/projects", projectRoutes);

/* ── Boards ──────────────────────────────────────────────────── */
const boardRoutes = require("./routes/boardRoutes");
app.use("/api/boards", boardRoutes);

/* ── Tasks ───────────────────────────────────────────────────── */
const taskRoutes = require("./routes/taskRoutes");
app.use("/api/tasks", taskRoutes);

/* ── Task Attachments (Cloudinary upload/delete) ─────────────── */
const attachmentRoutes = require("./routes/attachmentRoutes");
app.use("/api/tasks", attachmentRoutes);

/* ── Activity feed ───────────────────────────────────────────── */
const activityRoutes = require("./routes/activityRoutes");
app.use("/api/activities", activityRoutes);

/* ── Channels + Messages ─────────────────────────────────────── */
const channelRoutes = require("./routes/channelRoutes");
app.use("/api/channels", channelRoutes);

/* ── Direct Messages ─────────────────────────────────────────── */
const dmRoutes = require("./routes/dmRoutes");
app.use("/api/dm", dmRoutes);

/* ── Notifications ───────────────────────────────────────────── */
const notificationRoutes = require("./routes/notificationRoutes");
app.use("/api/notifications", notificationRoutes);

/* ── Global Search ───────────────────────────────────────────── */
const searchRoutes = require("./routes/searchRoutes");
app.use("/api/search", searchRoutes);

/* ── Analytics ───────────────────────────────────────────────── */
const analyticsRoutes = require("./routes/analyticsRoutes");
app.use("/api/analytics", analyticsRoutes);

/* ── Meetings ────────────────────────────────────────────────── */
const meetingRoutes = require("./routes/meetingRoutes");
app.use("/api/meetings", meetingRoutes);

/* ── Standups ────────────────────────────────────────────────── */
const standupRoutes = require("./routes/standupRoutes");
app.use("/api/standup", standupRoutes);

/* ── Global error handler ────────────────────────────────────── */
app.use((err, req, res, next) => {
  console.error("[ERROR]", err.stack || err.message);
  res.status(err.status || 500).json({
    message: err.message || "Internal server error",
    ...(process.env.NODE_ENV !== "production" && { stack: err.stack }),
  });
});

/* ── Start ───────────────────────────────────────────────────── */
const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`[server] ✓ Running on port ${PORT} (${process.env.NODE_ENV || "development"})`);
});

httpServer.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(`[server] ✗ Port ${PORT} is already in use. Kill the process using it or change PORT in .env.`);
    process.exit(1);
  } else {
    console.error("[server] ✗ Fatal error:", err);
    process.exit(1);
  }
});