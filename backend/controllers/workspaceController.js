const Workspace = require("../models/workspace");
const User = require("../models/User");
const { logActivity } = require("../utils/activityLogger");


exports.createWorkspace = async (req, res) => {
  try {

    const { name } = req.body;

    const workspace = await Workspace.create({
      name,
      owner: req.user._id,
      members: [
        {
          userId: req.user._id,
          role: "owner",
          joinedAt: Date.now()
        }
      ]
    });

    res.status(201).json(workspace);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getWorkspaces = async (req, res) => {
  try {
    const workspaces = await Workspace.find({ "members.userId": req.user._id });
    res.json(workspaces);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const jwt = require("jsonwebtoken");
const { sendInviteEmail } = require("../utils/emailService");

exports.inviteToWorkspace = async (req, res) => {
  try {
    const { email, role } = req.body;
    const { workspaceId } = req.params;

    const cleanEmail = (email || "").trim().toLowerCase();
    if (!cleanEmail || !/^[a-zA-Z0-9._%+\-]+@gmail\.com$/i.test(cleanEmail)) {
      return res.status(400).json({ message: "Please provide a valid Gmail address (@gmail.com)" });
    }

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      return res.status(404).json({ message: "Workspace not found" });
    }

    // Check if requester has permission (Owner or Admin)
    const isOwner = workspace.owner && workspace.owner.toString() === req.user._id.toString();
    const requester = workspace.members.find(m => {
      const mId = m.userId?._id || m.userId;
      return mId && mId.toString() === req.user._id.toString();
    });
    const hasPermission = isOwner || (requester && ["owner", "admin"].includes(requester.role));
    if (!hasPermission) {
      return res.status(403).json({ message: "Only owners and admins can invite members" });
    }

    // Check if invited email is already a member
    const existingUser = await User.findOne({ email: cleanEmail });
    if (existingUser) {
      const alreadyMember = workspace.members.some(m => {
        const mId = m.userId?._id || m.userId;
        return mId && mId.toString() === existingUser._id.toString();
      });
      if (alreadyMember) {
        return res.status(400).json({ message: "This user is already a member of the workspace" });
      }
    }

    const inviteRole = role || "member";

    // Generate JWT invite token (embed email + workspace + role)
    const token = jwt.sign(
      { workspaceId, email: cleanEmail, role: inviteRole, type: "workspace_invite" },
      process.env.INVITE_SECRET || "invite_secret",
      { expiresIn: "7d" }
    );

    // Build invite link with automatic production domain fallback
    const frontendUrl = (
      process.env.FRONTEND_URL ||
      process.env.CLIENT_URL ||
      (process.env.NODE_ENV === "production"
        ? "https://devspace-frontend-tx54.onrender.com"
        : "http://localhost:5173")
    ).replace(/\/$/, "");
    const inviteLink = `${frontendUrl}/join/${token}`;

    // Send invitation email (gracefully skip if SMTP not configured)
    let emailSent = false;
    let emailErrorReason = null;
    const inviter = await User.findById(req.user._id);
    try {
      await sendInviteEmail({
        toEmail: cleanEmail,
        inviterName: inviter?.name || "A team member",
        workspaceName: workspace.name,
        role: inviteRole,
        inviteLink,
      });
      emailSent = true;
    } catch (emailErr) {
      console.error("[invite] Email send failed:", emailErr.message);
      emailErrorReason = emailErr.message;
    }

    await logActivity(workspaceId, req.user._id, "member_invited", {
      invitedEmail: cleanEmail,
      role: inviteRole
    });

    res.json({
      message: emailSent ? "Invite sent via email" : `Invite link created${emailErrorReason ? ` (${emailErrorReason})` : ""}. You can copy the link below.`,
      inviteLink,
      emailSent,
      ...(emailErrorReason && { emailError: emailErrorReason })
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.joinWorkspace = async (req, res) => {
  try {
    const { token } = req.params;

    // Verify token
    const decoded = jwt.verify(token, process.env.INVITE_SECRET || "invite_secret");

    if (decoded.type !== "workspace_invite") {
      return res.status(400).json({ message: "Invalid invite token" });
    }

    if ((decoded.email || "").toLowerCase() !== (req.user.email || "").toLowerCase()) {
      return res.status(403).json({ message: "This invite is for a different email address" });
    }

    const workspace = await Workspace.findById(decoded.workspaceId);
    if (!workspace) {
      return res.status(404).json({ message: "Workspace not found" });
    }

    // Check if user is already a member
    const alreadyMember = workspace.members.some(m => {
      const mId = m.userId?._id || m.userId;
      return mId && mId.toString() === req.user._id.toString();
    });
    if (alreadyMember) {
      return res.status(400).json({ message: "You are already a member of this workspace" });
    }

    // Add user to workspace
    workspace.members.push({
      userId: req.user._id,
      role: decoded.role,
      joinedAt: Date.now()
    });

    await workspace.save();

    // Log activity
    await logActivity(decoded.workspaceId, req.user._id, "member_joined", {
      role: decoded.role
    });

    res.json({ message: "Successfully joined workspace", workspace });

  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(400).json({ message: "Invite link has expired" });
    }
    if (err.name === "JsonWebTokenError") {
      return res.status(400).json({ message: "Invalid invite link" });
    }
    res.status(500).json({ message: err.message });
  }
};

exports.getWorkspaceMembers = async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const workspace = await Workspace.findById(workspaceId).populate("members.userId", "name email avatar");

    if (!workspace) {
      return res.status(404).json({ message: "Workspace not found" });
    }

    res.json(workspace.members);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.changeRole = async (req, res) => {
  try {
    const { workspaceId, userId } = req.params;
    const { role } = req.body;

    const workspace = await Workspace.findById(workspaceId).populate("members.userId", "name email avatar");

    const member = workspace.members.find(
      (m) => m.userId._id.toString() === userId
    );

    const oldRole = member.role;
    member.role = role;

    await workspace.save();

    await logActivity(workspaceId, req.user._id, "role_changed", {
      oldRole,
      newRole: role,
      assignedToName: member.userId.name || member.userId.toString()
    });

    res.json({ message: "Role updated", workspace });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getDashboard = async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const Activity = require("../models/Activity");
    const Task = require("../models/Task");
    const Board = require("../models/Board");
    const Project = require("../models/Project");
    const Channel = require("../models/Channel");

    const workspace = await Workspace.findById(workspaceId).populate(
      "members.userId",
      "name email avatar"
    );
    if (!workspace) return res.status(404).json({ message: "Workspace not found" });

    // Get all projects → boards → tasks in this workspace
    const projects = await Project.find({ workspace: workspaceId });
    const projectIds = projects.map(p => p._id);

    const boards = await Board.find({ project: { $in: projectIds } });
    const boardIds = boards.map(b => b._id);

    const allTasks = await Task.find({ board: { $in: boardIds } });

    // Task counts by status
    const taskCounts = {
      todo: allTasks.filter(t => t.status === "todo").length,
      inprogress: allTasks.filter(t => t.status === "inprogress").length,
      review: allTasks.filter(t => t.status === "review").length,
      done: allTasks.filter(t => t.status === "done").length,
      total: allTasks.length
    };

    // Recent 10 activities
    const recentActivity = await Activity.find({ workspace: workspaceId })
      .populate("user", "name avatar")
      .sort({ createdAt: -1 })
      .limit(10);

    // Member list with roles
    const members = workspace.members.map(m => ({
      _id: m.userId?._id,
      name: m.userId?.name,
      email: m.userId?.email,
      avatar: m.userId?.avatar,
      role: m.role,
      joinedAt: m.joinedAt
    }));

    // Channel list
    const channels = await Channel.find({ workspace: workspaceId })
      .select("name isPrivate description createdAt")
      .sort({ createdAt: 1 });

    res.json({ taskCounts, recentActivity, members, channels });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateWorkspace = async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: "Workspace name is required" });
    }

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      return res.status(404).json({ message: "Workspace not found" });
    }

    const member = workspace.members.find(
      (m) => m.userId && m.userId.toString() === req.user._id.toString()
    );
    if (!member || !["owner", "admin"].includes(member.role)) {
      return res.status(403).json({ message: "Only workspace owners or admins can rename the workspace" });
    }

    workspace.name = name.trim();
    await workspace.save();

    await logActivity(workspaceId, req.user._id, "workspace_updated", {
      name: workspace.name,
    });

    res.json(workspace);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


exports.deleteWorkspace = async (req, res) => {
  try {
    const { workspaceId } = req.params;

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      return res.status(404).json({ message: "Workspace not found" });
    }

    const member = workspace.members.find(
      (m) => m.userId && m.userId.toString() === req.user._id.toString()
    );
    if (!member || member.role !== "owner") {
      return res.status(403).json({ message: "Only workspace owner can delete the workspace" });
    }

    const Project = require("../models/Project");
    const Channel = require("../models/Channel");
    const Board = require("../models/Board");
    const Task = require("../models/Task");
    const Activity = require("../models/Activity");
    const DirectMessage = require("../models/DirectMessage");
    const Message = require("../models/Message");

    const projects = await Project.find({ workspace: workspaceId });
    const projectIds = projects.map((p) => p._id);

    const boards = await Board.find({ project: { $in: projectIds } });
    const boardIds = boards.map((b) => b._id);

    const channels = await Channel.find({ workspace: workspaceId });
    const channelIds = channels.map((c) => c._id);

    if (boardIds.length > 0) {
      await Task.deleteMany({ board: { $in: boardIds } });
      await Board.deleteMany({ _id: { $in: boardIds } });
    }
    if (projectIds.length > 0) {
      await Project.deleteMany({ _id: { $in: projectIds } });
    }
    if (channelIds.length > 0) {
      if (Message) await Message.deleteMany({ channel: { $in: channelIds } });
      await Channel.deleteMany({ _id: { $in: channelIds } });
    }
    if (DirectMessage) {
      await DirectMessage.deleteMany({ workspace: workspaceId });
    }
    await Activity.deleteMany({ workspace: workspaceId });
    await Workspace.findByIdAndDelete(workspaceId);

    res.json({ message: "Workspace deleted successfully", workspaceId });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
