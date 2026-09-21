const express = require("express");
const router  = express.Router();

const { registerUser, loginUser, getMe } = require("../controllers/authController.js");
const { authLimiter } = require("../middleware/securityMiddleware");
const { protect } = require("../middleware/authmiddleware");

// Apply strict rate limit to auth endpoints (10 req / 15 min per IP)
router.post("/register", authLimiter, registerUser);
router.post("/login",    authLimiter, loginUser);
router.get("/me",        protect,     getMe);

module.exports = router;