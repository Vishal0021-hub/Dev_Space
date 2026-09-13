const express = require("express");
const router = express.Router();

const {
  getConfig,
  updateConfig,
  submitEntry,
  getEntries,
  getMyEntry,
  getMissingMembers,
  getHistory,
} = require("../controllers/standupController");

const { protect } = require("../middleware/authmiddleware");
const { isMember, isAdmin } = require("../middleware/roleMiddleware");

// Config
router.get("/config/:workspaceId", protect, isMember, getConfig);
router.put("/config/:workspaceId", protect, isAdmin, updateConfig);

// Entries
router.post("/entries", protect, isMember, submitEntry);
router.get("/entries/:workspaceId", protect, isMember, getEntries);
router.get("/entries/:workspaceId/me", protect, isMember, getMyEntry);
router.get("/entries/:workspaceId/missing", protect, isMember, getMissingMembers);
router.get("/entries/:workspaceId/history", protect, isMember, getHistory);

module.exports = router;
