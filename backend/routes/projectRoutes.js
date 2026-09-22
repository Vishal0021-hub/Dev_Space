const express = require("express");
const router = express.Router();

const {
  createProject,
  getProjects,
  getProjectById
} = require("../controllers/projectController");

const { protect } = require("../middleware/authmiddleware");
const { isAdmin, isMember } = require("../middleware/roleMiddleware");

// Create project - Any workspace member, admin, or owner can create
router.post("/", protect, isMember, createProject);

// Get single project details - Just auth (data scoped by projectId)
router.get("/details/:projectId", protect, getProjectById);

// Get projects by workspace - Any member can view
router.get("/:workspaceId", protect, isMember, getProjects);

module.exports = router;