const express = require("express");
const router = express.Router();

const {
  createTask,
  getTasks,
  updateTask,
  moveTask,
  deleteTask,
  assignTask,
  updateTaskStatus,
  addDependency,
  removeDependency,
  getDependencies,
  addGithubLink,
  removeGithubLink,
  resolveFlag,
  getWorkspaceTasks
} = require("../controllers/taskController");

const { protect } = require("../middleware/authmiddleware");
const { isMember, isAdmin } = require("../middleware/roleMiddleware");

// ── Specific prefix routes BEFORE generic /:id routes ──────────

// Get all tasks in a workspace (for mentions, pickers, etc.)
router.get("/workspace/:workspaceId", protect, isMember, getWorkspaceTasks);

// Move task — has explicit /move/ prefix — safe before /:taskId
router.put("/move/:taskId", protect, moveTask);

// GET tasks by board — just auth (data scoped by boardId)
router.get("/board/:boardId", protect, getTasks);

// Update status — specific suffix
router.patch("/:taskId/status", protect, isMember, updateTaskStatus);

// Assign task — specific suffix, admin only
router.put("/:taskId/assign", protect, isAdmin, assignTask);

// Create task — body has boardId, isMember resolves workspace from boardId
router.post("/", protect, isMember, createTask);

// Update task metadata
router.put("/:taskId", protect, updateTask);

// Delete task
router.delete("/:taskId", protect, isAdmin, deleteTask);

/* ── Dependencies ─────────────────────────────────────────────── */
router.get("/:taskId/dependencies", protect, isMember, getDependencies);
router.post("/:taskId/dependencies", protect, isMember, addDependency);
router.delete("/:taskId/dependencies/:depId", protect, isMember, removeDependency);

/* ── GitHub Links (Read-Only) ─────────────────────────────────── */
router.post("/:taskId/github-links", protect, isMember, addGithubLink);
router.delete("/:taskId/github-links/:linkId", protect, isMember, removeGithubLink);

/* ── Blocker Flags ────────────────────────────────────────────── */
router.patch("/:taskId/flags/:flagId/resolve", protect, isMember, resolveFlag);

module.exports = router;