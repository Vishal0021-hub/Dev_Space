const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authmiddleware");

// Get current user's GitHub integration status
router.get("/me", protect, (req, res) => {
  res.json({
    connected: false,
    username: null,
    avatarUrl: null,
    scope: [],
  });
});

// Get repos
router.get("/repos", protect, (req, res) => {
  res.json([]);
});

// OAuth initiation
router.get("/oauth/url", protect, (req, res) => {
  res.status(501).json({ message: "GitHub integration not configured in this environment" });
});

module.exports = router;
