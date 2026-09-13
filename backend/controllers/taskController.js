const axios = require("axios");
const Task = require("../models/Task");
const Board = require("../models/Board");
const User = require("../models/User");
const Project = require("../models/Project");
const Workspace = require("../models/workspace");
const Comment = require("../models/Message");   // re-use Message for task comments if exists
const { logActivity } = require("../utils/activityLogger");
const { getIO } = require("../socket");


const emitToWs = (workspaceId, event, payload) => {
  try { getIO().to(`ws:${workspaceId}`).emit(event, payload); } catch { }
};

const getWorkspaceForTask = async (task) => {
  const populatedTask = await Task.findById(task._id).populate({
    path: "board",
    populate: { path: "project" }
  });
  return { workspaceId: populatedTask?.board?.project?.workspace };
};



/* ═══════════════════════════════════════════════════════════════
   TASK CRUD
   ═══════════════════════════════════════════════════════════════ */

// Create Task
exports.createTask = async (req, res) => {
  try {
    console.log("Create Task Request:", req.body);
    const { title, description, boardId, priority, dueDate } = req.body;

    const board = await Board.findById(boardId).populate("project");

    if (!board) {
      return res.status(404).json({ message: "Board not found" });
    }

    const task = await Task.create({
      title,
      description,
      board: boardId,
      priority,
      dueDate,
      createdBy: req.user._id,
    });

    // Log Activity
    const workspaceId = board.project?.workspace?._id || board.project?.workspace || board.project?._id;

    if (workspaceId) {
      await logActivity(workspaceId, req.user._id, "task_created", {
        taskTitle: title,
        projectName: board.project?.name || "Project",
      }, { entityType: "task", entityId: task._id });

      emitToWs(workspaceId, "task:created", { task: task.toObject(), boardId });
    }

    res.status(201).json(task);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get Tasks by Board
exports.getTasks = async (req, res) => {
  try {
    const boardId = req.params.boardId;
    const tasks = await Task.find({ board: boardId })
      .populate("assignedTo", "name email avatar")
      .populate("blockedBy", "status title");
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update Task
exports.updateTask = async (req, res) => {
  try {
    const { taskId } = req.params;
    const updates = req.body;

    const task = await Task.findById(taskId);
    if (!task) return res.status(404).json({ message: "Task not found" });

    Object.assign(task, updates);
    await task.save();

    res.json(task);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Move Task to another Board
exports.moveTask = async (req, res) => {
  try {
    const { taskId } = req.params;
    const { boardId } = req.body;

    const task = await Task.findById(taskId);
    if (!task) return res.status(404).json({ message: "Task not found" });

    const oldBoard = await Board.findById(task.board);
    const newBoard = await Board.findById(boardId).populate("project");

    task.board = boardId;
    await task.save();

    await logActivity(newBoard.project.workspace, req.user._id, "task_moved", {
      taskTitle: task.title,
      fromBoard: oldBoard.name,
      toBoard: newBoard.name,
    }, { entityType: "task", entityId: task._id });

    emitToWs(newBoard.project.workspace, "task:moved", {
      taskId,
      fromBoardId: oldBoard._id.toString(),
      toBoardId: boardId,
      task: task.toObject(),
    });

    res.json({ message: "Task moved successfully", task });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete Task
exports.deleteTask = async (req, res) => {
  try {
    const { taskId } = req.params;
    const task = await Task.findById(taskId).populate({ path: "board", populate: { path: "project" } });
    if (!task) return res.status(404).json({ message: "Task not found" });

    const workspaceId = task.board.project.workspace;
    const taskTitle = task.title;

    await Task.findByIdAndDelete(taskId);

    await logActivity(workspaceId, req.user._id, "task_deleted", { taskTitle },
      { entityType: "task", entityId: taskId });

    emitToWs(workspaceId, "task:deleted", { taskId });

    res.json({ message: "Task deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Assign Task
exports.assignTask = async (req, res) => {
  try {
    const { taskId } = req.params;
    const { userId } = req.body;

    const task = await Task.findById(taskId);
    if (!task) return res.status(404).json({ message: "Task not found" });

    const board = await Board.findById(task.board).populate("project");
    if (!board) return res.status(404).json({ message: "Board not found" });

    if (userId) {
      const workspace = req.workspace;
      const isMemberOfWs = workspace.members.some(m => m.userId.toString() === userId.toString());
      if (!isMemberOfWs) {
        return res.status(400).json({ message: "Assignee must be a workspace member" });
      }
    }

    task.assignedTo = userId || null;
    await task.save();

    if (userId) {
      const assignedUser = await User.findById(userId);
      await logActivity(board.project.workspace, req.user._id, "task_assigned", {
        taskTitle: task.title,
        assignedToName: assignedUser?.name || "",
      }, { entityType: "task", entityId: task._id });
    }

    const populated = await Task.findById(taskId).populate("assignedTo", "name email avatar");

    emitToWs(board.project.workspace, "task:assigned", {
      taskId,
      task: populated.toObject(),
    });

    res.json({ message: "Task assigned", task: populated });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ── Update Task Status — PATCH /api/tasks/:taskId/status ───── */
exports.updateTaskStatus = async (req, res) => {
  try {
    const { taskId } = req.params;
    const { status } = req.body;

    const validStatuses = ["todo", "inprogress", "review", "done"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: `Invalid status. Must be one of: ${validStatuses.join(", ")}` });
    }

    const task = await Task.findById(taskId);
    if (!task) return res.status(404).json({ message: "Task not found" });

    const oldStatus = task.status;

    // Check blockers if moving to inprogress
    if (status === "inprogress") {
      const populatedTask = await Task.findById(taskId).populate("blockedBy");
      const activeBlockers = populatedTask.blockedBy.filter(t => t.status !== "done");
      if (activeBlockers.length > 0) {
        return res.status(400).json({
          error: "Task is blocked",
          blockers: activeBlockers.map(t => ({ _id: t._id, title: t.title, status: t.status }))
        });
      }
    }

    task.status = status;
    await task.save();

    const { workspaceId } = await getWorkspaceForTask(task) || {};

    if (workspaceId) {
      await logActivity(workspaceId, req.user._id, "task_status_changed", {
        taskTitle: task.title,
        oldStatus,
        newStatus: status,
      }, { entityType: "task", entityId: task._id });

      emitToWs(workspaceId, "task:statusChanged", {
        taskId,
        boardId: task.board.toString(),
        status,
        oldStatus,
      });

      // Item 3: Unblock tasks if this is marked as done
      if (status === "done" && task.blocking?.length > 0) {
        for (const blockedTaskId of task.blocking) {
          const blockedTask = await Task.findById(blockedTaskId).populate("blockedBy");
          if (blockedTask) {
            const activeBlockers = blockedTask.blockedBy.filter(t => t.status !== "done");
            if (activeBlockers.length === 0) {
              emitToWs(workspaceId, "task:unblocked", { taskId: blockedTask._id.toString() });
            }
          }
        }
      }
    }

    res.json({ message: "Task status updated", task });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ═══════════════════════════════════════════════════════════════
   DEPENDENCIES
   ═══════════════════════════════════════════════════════════════ */
exports.addDependency = async (req, res) => {
  try {
    const { taskId } = req.params;
    const { blockedByTaskId } = req.body;

    if (taskId === blockedByTaskId) {
      return res.status(400).json({ message: "Task cannot block itself" });
    }

    const task = await Task.findById(taskId);
    const blocker = await Task.findById(blockedByTaskId);

    if (!task || !blocker) return res.status(404).json({ message: "Task not found" });

    // Prevent circular dependency (simple 1-level)
    if (blocker.blockedBy && blocker.blockedBy.includes(taskId)) {
      return res.status(400).json({ message: "Circular dependency detected" });
    }

    if (!task.blockedBy.includes(blockedByTaskId)) {
      task.blockedBy.push(blockedByTaskId);
      await task.save();
    }
    if (!blocker.blocking.includes(taskId)) {
      blocker.blocking.push(taskId);
      await blocker.save();
    }

    const { workspaceId } = await getWorkspaceForTask(task) || {};
    if (workspaceId) {
      await logActivity(workspaceId, req.user._id, "dependency_added", {
        blockedBy: blockedByTaskId,
      }, { entityType: "task", entityId: task._id });

      const blockers = await Task.find({ _id: { $in: task.blockedBy } });
      emitToWs(workspaceId, "task:blocked", { taskId, blockers });
    }

    res.json(task);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.removeDependency = async (req, res) => {
  try {
    const { taskId, depId } = req.params;

    const task = await Task.findById(taskId);
    const blocker = await Task.findById(depId);

    if (!task) return res.status(404).json({ message: "Task not found" });

    task.blockedBy = task.blockedBy.filter(id => id.toString() !== depId);
    await task.save();

    if (blocker) {
      blocker.blocking = blocker.blocking.filter(id => id.toString() !== taskId);
      await blocker.save();
    }

    const { workspaceId } = await getWorkspaceForTask(task) || {};
    if (workspaceId) {
      await logActivity(workspaceId, req.user._id, "dependency_removed", {}, { entityType: "task", entityId: task._id });

      const populatedTask = await Task.findById(taskId).populate("blockedBy");
      const activeBlockers = populatedTask.blockedBy.filter(t => t.status !== "done");
      if (activeBlockers.length === 0) {
        emitToWs(workspaceId, "task:unblocked", { taskId });
      }
    }

    res.json({ message: "Dependency removed", task });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getDependencies = async (req, res) => {
  try {
    const { taskId } = req.params;
    const task = await Task.findById(taskId)
      .populate("blockedBy", "title status assignedTo")
      .populate("blocking", "title status assignedTo");

    if (!task) return res.status(404).json({ message: "Task not found" });

    const populatedBlockedBy = await User.populate(task.blockedBy, { path: "assignedTo", select: "name" });
    const populatedBlocking = await User.populate(task.blocking, { path: "assignedTo", select: "name" });

    res.json({ blockedBy: populatedBlockedBy, blocking: populatedBlocking });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ═══════════════════════════════════════════════════════════════
   GITHUB LINKS (READ-ONLY)
   ═══════════════════════════════════════════════════════════════ */
exports.addGithubLink = async (req, res) => {
  try {
    const { taskId } = req.params;
    const { url } = req.body;

    const task = await Task.findById(taskId);
    if (!task) return res.status(404).json({ message: "Task not found" });

    let type = "pr";
    if (url.includes("/commit/")) type = "commit";
    else if (url.includes("/issues/")) type = "issue";

    const match = url.match(/github\.com\/([^\/]+)\/([^\/]+)\/(pull|commit|issues)\/([^\/]+)/);
    let meta = {};

    if (match) {
      const owner = match[1];
      const repo = match[2];
      const numberOrSha = match[4];

      try {
        let apiUrl = "";
        if (type === "pr") apiUrl = `https://api.github.com/repos/${owner}/${repo}/pulls/${numberOrSha}`;
        else if (type === "commit") apiUrl = `https://api.github.com/repos/${owner}/${repo}/commits/${numberOrSha}`;
        else if (type === "issue") apiUrl = `https://api.github.com/repos/${owner}/${repo}/issues/${numberOrSha}`;

        const ghRes = await axios.get(apiUrl, { headers: { "User-Agent": "DevSpace" } });
        const data = ghRes.data;

        meta = {
          title: data.title || data.commit?.message?.split("\n")[0],
          number: data.number || null,
          state: data.state || null,
          author: data.user?.login || data.author?.login || data.commit?.author?.name,
          fetchedAt: new Date()
        };
      } catch (ghErr) {
        console.warn("Could not fetch GH meta (private or rate limit):", ghErr.message);
      }
    }

    task.githubLinks = task.githubLinks || [];
    task.githubLinks.push({ url, type, meta: Object.keys(meta).length > 0 ? meta : undefined });
    await task.save();

    res.json(task);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.removeGithubLink = async (req, res) => {
  try {
    const { taskId, linkId } = req.params;
    const task = await Task.findById(taskId);
    if (!task) return res.status(404).json({ message: "Task not found" });

    task.githubLinks = task.githubLinks.filter(l => l._id.toString() !== linkId);
    await task.save();
    res.json({ message: "Link removed", task });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ── Resolve a blocker flag ──────────────────────────────────── */
exports.resolveFlag = async (req, res) => {
  try {
    const { taskId, flagId } = req.params;
    const task = await Task.findById(taskId);
    if (!task) return res.status(404).json({ message: "Task not found" });

    const flag = task.flags?.id(flagId);
    if (!flag) return res.status(404).json({ message: "Flag not found" });

    flag.resolved = true;
    flag.resolvedAt = new Date();
    flag.resolvedBy = req.user._id;
    await task.save();

    res.json({ message: "Flag resolved", task });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ── Get All Tasks in Workspace ──────────────────────────────── */
exports.getWorkspaceTasks = async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const Project = require("../models/Project");
    const Board = require("../models/Board");

    const projects = await Project.find({ workspace: workspaceId }).select("_id");
    const projectIds = projects.map((p) => p._id);

    const boards = await Board.find({ project: { $in: projectIds } }).select("_id");
    const boardIds = boards.map((b) => b._id);

    const tasks = await Task.find({ board: { $in: boardIds } })
      .populate("assignedTo", "name avatar")
      .select("title status priority assignedTo board flags createdAt")
      .sort({ updatedAt: -1 })
      .limit(200);

    res.json(tasks);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};