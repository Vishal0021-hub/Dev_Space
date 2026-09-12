const helmet = require("helmet");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const morgan = require("morgan");

/* ── CORS ────────────────────────────────────────────────────── */
const allowedOrigins = (process.env.CLIENT_URL || "http://localhost:5173")
  .split(",")
  .map(s => s.trim())
  .filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, server-to-server)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

/* ── Safe NoSQL injection sanitizer ─────────────────────────────
   express-mongo-sanitize v2 tries to write req.query which is a
   read-only getter in Node 18+. We implement the same protection
   manually to avoid the TypeError crash.
   ─────────────────────────────────────────────────────────────── */
function sanitizeObject(obj) {
  if (!obj || typeof obj !== "object") return obj;
  for (const key of Object.keys(obj)) {
    if (key.startsWith("$") || key.includes(".")) {
      delete obj[key];
    } else if (typeof obj[key] === "object") {
      sanitizeObject(obj[key]);
    }
  }
  return obj;
}

function mongoSanitizeMiddleware(req, _res, next) {
  // Sanitize body and params only — req.query is read-only in Node 18+
  if (req.body) sanitizeObject(req.body);
  if (req.params) sanitizeObject(req.params);
  next();
}

/* ── Safe XSS sanitizer ──────────────────────────────────────────
   xss-clean is deprecated and has the same req.query mutation issue.
   Lightweight string-level strip that avoids that.
   ─────────────────────────────────────────────────────────────── */
const XSS_PATTERN = /<[^>]*>|javascript:/gi;

function stripXss(value) {
  if (typeof value === "string") return value.replace(XSS_PATTERN, "");
  if (Array.isArray(value)) return value.map(stripXss);
  if (value && typeof value === "object") {
    for (const k of Object.keys(value)) value[k] = stripXss(value[k]);
  }
  return value;
}

function xssMiddleware(req, _res, next) {
  /**
   * DISABLED: Aggressive stripping of < > and javascript: tokens
   * breaks code snippets. In a developer platform, we must allow
   * these characters. Frontend must handle rendering safely.
   */
  next();
}

/* ── Rate limiters ────────────────────────────────────────────── */

/**
 * Auth-specific: 10 requests per 15 minutes per IP.
 * Exported so server.js can apply it specifically to /api/auth/*.
 * Skip in development & test so repeated testing doesn't trigger 429.
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,   // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 429,
    message: "Too many requests from this IP, please try again later",
  },
  skip: () => process.env.NODE_ENV !== "production",
});

/**
 * General API: 100 requests per 10 minutes per IP (per spec).
 */
const generalLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,   // 10 minutes (spec says 10 min for general)
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 429,
    message: "Too many requests from this IP, please try again later",
  },
  skip: () => process.env.NODE_ENV !== "production",
});

/**
 * Invite-specific: lenient, invites are one-time actions.
 */
const inviteLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 429,
    message: "Too many invite requests. Please try again later.",
  },
  skip: () => process.env.NODE_ENV !== "production",
});

/* ── Export Individual Middlewares for Ordered Registration ── */
const helmetMiddleware = helmet({
  contentSecurityPolicy: {
    directives: {
      ...helmet.contentSecurityPolicy.getDefaultDirectives(),
      "script-src": ["'self'", "'unsafe-inline'", "'unsafe-eval'", "blob:"],
      "frame-src": ["'self'", "blob:"],
      "img-src": ["'self'", "data:", "blob:", "https://res.cloudinary.com"],
      "connect-src": ["'self'", "https://api.cloudinary.com", "*"],
    },
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
});

const corsMiddleware = cors(corsOptions);

module.exports = {
  helmetMiddleware,
  generalLimiter,
  mongoSanitizeMiddleware,
  xssMiddleware,
  authLimiter,
  corsMiddleware,
  inviteLimiter,
};
