const express = require("express");
const router = express.Router();

const {
  createMeeting,
  getMeetings,
  getMeeting,
  updateMeeting,
  deleteMeeting,
  getMeetingsByTask,
} = require("../controllers/meetingController");

const { protect } = require("../middleware/authmiddleware");
const { isMember, isAdmin } = require("../middleware/roleMiddleware");

// Backlinks: get all meetings that mention a specific task
router.get("/task/:taskId", protect, getMeetingsByTask);

// Workspace meetings (list)
router.get("/workspace/:workspaceId", protect, isMember, getMeetings);

// Single meeting
router.get("/:meetingId", protect, getMeeting);

// Create meeting (body contains workspaceId)
router.post("/", protect, isMember, createMeeting);

// Update meeting
router.put("/:meetingId", protect, updateMeeting);

// Delete meeting — admin only
router.delete("/:meetingId", protect, isAdmin, deleteMeeting);

module.exports = router;
