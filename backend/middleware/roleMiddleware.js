const mongoose = require("mongoose");
const Workspace = require("../models/workspace");
const Project = require("../models/Project");
const Board = require("../models/Board");
const Task = require("../models/Task");

/**
 * Resolves the workspaceId from request params, body, or by traversing
 * associated Project, Board, or Task documents.
 */
async function resolveWorkspaceId(req) {
  let workspaceId = req.params?.workspaceId || req.body?.workspaceId;
  if (workspaceId && mongoose.isValidObjectId(workspaceId)) {
    return workspaceId;
  }

  // Check projectId
  const projectId = req.params?.projectId || req.body?.projectId;
  if (projectId && mongoose.isValidObjectId(projectId)) {
    const project = await Project.findById(projectId).select("workspace");
    if (project?.workspace) return project.workspace;
  }

  // Check boardId
  const boardId = req.params?.boardId || req.body?.boardId;
  if (boardId && mongoose.isValidObjectId(boardId)) {
    const board = await Board.findById(boardId).populate("project");
    if (board?.project?.workspace) return board.project.workspace;
  }

  // Check taskId
  const taskId = req.params?.taskId || req.body?.taskId;
  if (taskId && mongoose.isValidObjectId(taskId)) {
    const task = await Task.findById(taskId).populate({
      path: "board",
      populate: { path: "project" },
    });
    if (task?.board?.project?.workspace) {
      return task.board.project.workspace;
    }
  }

  return null;
}

/**
 * Safely finds a member record within a workspace, handling ObjectId instances,
 * populated member user objects, and explicit workspace owner fallback.
 */
function findWorkspaceMember(workspace, userId) {
  if (!workspace || !userId) return null;
  const targetId = userId.toString();

  // Check direct owner match
  const isDirectOwner = workspace.owner && workspace.owner.toString() === targetId;

  // Search members array safely handling both raw ObjectIds and populated objects
  const member = workspace.members?.find((m) => {
    const mId = m?.userId?._id || m?.userId;
    return mId && mId.toString() === targetId;
  });

  if (!member && isDirectOwner) {
    return { userId, role: "owner" };
  }

  // If user is owner on workspace document, ensure their role is treated as owner
  if (member && isDirectOwner && member.role !== "owner") {
    member.role = "owner";
  }

  return member || null;
}

/**
 * Middleware factory to authorize users based on their role in a workspace.
 * @param {string[]} allowedRoles - Roles allowed to perform the action.
 */
const authorize = (allowedRoles) => {
  return async (req, res, next) => {
    try {
      const workspaceId = await resolveWorkspaceId(req);
      if (!workspaceId) {
        return res.status(400).json({ message: "Workspace ID not found for authorization" });
      }

      const workspace = await Workspace.findById(workspaceId);
      if (!workspace) {
        return res.status(404).json({ message: "Workspace not found" });
      }

      const member = findWorkspaceMember(workspace, req.user?._id);
      if (!member || !allowedRoles.includes(member.role)) {
        return res.status(403).json({ message: "Not authorized for this action" });
      }

      req.workspace = workspace;
      req.userRole = member.role;
      next();
    } catch (error) {
      console.error("[roleMiddleware] Error:", error.message);
      res.status(500).json({ message: error.message });
    }
  };
};

const isOwner = authorize(["owner"]);
const isAdmin = authorize(["owner", "admin"]);
const isMember = authorize(["owner", "admin", "member"]);

module.exports = { authorize, isOwner, isAdmin, isMember, resolveWorkspaceId, findWorkspaceMember };
