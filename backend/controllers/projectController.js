const Project = require("../models/Project");
const Workspace = require("../models/workspace");
const { logActivity } = require("../utils/activityLogger");

// Create Project
exports.createProject = async (req, res) => {
  try {
    const { name, workspaceId, description } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: "Project name is required" });
    }

    if (!workspaceId) {
      return res.status(400).json({ message: "Workspace ID is required" });
    }

    // check workspace exists
    const workspace = await Workspace.findById(workspaceId);

    if (!workspace) {
      return res.status(404).json({ message: "Workspace not found" });
    }

    // check user is member or owner safely
    const targetUserId = req.user._id.toString();
    const isDirectOwner = workspace.owner && workspace.owner.toString() === targetUserId;
    const isMember = isDirectOwner || (workspace.members && workspace.members.some((member) => {
      const mId = member?.userId?._id || member?.userId;
      return mId && mId.toString() === targetUserId;
    }));

    if (!isMember) {
      return res.status(403).json({ message: "Not authorized to create project in this workspace" });
    }

    const project = await Project.create({
      name: name.trim(),
      description: description ? description.trim() : "",
      workspace: workspaceId,
      createdBy: req.user._id
    });

    // Create a default Kanban Board for the project so users immediately have an active board
    const Board = require("../models/Board");
    const existingBoards = await Board.find({ project: project._id });
    if (existingBoards.length === 0) {
      await Board.create({
        name: "Main Board",
        project: project._id,
      });
    }

    await logActivity(workspaceId, req.user._id, "project_created", {
      projectName: name.trim()
    });

    res.status(201).json(project);

  } catch (error) {
    console.error("[createProject] Error:", error);
    res.status(500).json({ message: error.message });
  }
};

// Get Projects of a Workspace
exports.getProjects = async (req, res) => {
  try {

    const { workspaceId } = req.params;

    const projects = await Project.find({ workspace: workspaceId });

    res.json(projects);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get single project details
exports.getProjectById = async (req, res) => {
  try {
    const project = await Project.findById(req.params.projectId);
    if (!project) return res.status(404).json({ message: "Project not found" });
    res.json(project);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};