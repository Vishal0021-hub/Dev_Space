const Channel = require("../models/Channel");
const Message = require("../models/Message");
const { logActivity } = require("../utils/activityLogger");
const { getIO } = require("../socket");

// GET /api/channels?workspaceId=xxx
exports.getChannels = async (req, res) => {
  try {
    const { workspaceId } = req.query;
    if (!workspaceId) return res.status(400).json({ message: "workspaceId is required" });

    const channels = await Channel.find({
      workspace: workspaceId,
      $or: [
        { isPrivate: false },
        { "members.user": req.user._id }
      ]
    })
      .populate("createdBy", "name avatar")
      .sort({ createdAt: 1 });

    res.json(channels);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/channels
exports.createChannel = async (req, res) => {
  try {
    const { name, workspaceId, isPrivate = false, description } = req.body;

    if (!name || !workspaceId) {
      return res.status(400).json({ message: "name and workspaceId are required" });
    }

    const existing = await Channel.findOne({ workspace: workspaceId, name: name.trim() });
    if (existing) return res.status(409).json({ message: "A channel with this name already exists" });

    const channel = await Channel.create({
      name: name.trim(),
      workspace: workspaceId,
      isPrivate,
      description,
      createdBy: req.user._id,
      members: [{ user: req.user._id, role: "owner" }]
    });

    await channel.populate("createdBy", "name avatar");
    res.status(201).json(channel);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE /api/channels/:channelId
exports.deleteChannel = async (req, res) => {
  try {
    const { channelId } = req.params;

    const channel = await Channel.findById(channelId);
    if (!channel) return res.status(404).json({ message: "Channel not found" });

    const isCreator = channel.createdBy.toString() === req.user._id.toString();
    if (!isCreator && !["owner", "admin"].includes(req.userRole)) {
      return res.status(403).json({ message: "Only the channel creator or an admin can delete this channel" });
    }

    await Message.deleteMany({ channel: channelId });
    await Channel.findByIdAndDelete(channelId);

    // Notify all channel members
    try { getIO().to(`ch:${channelId}`).emit("channel:deleted", { channelId }); } catch {}

    res.json({ message: "Channel deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/channels/:channelId/messages
exports.getMessages = async (req, res) => {
  try {
    const { channelId } = req.params;
    const page  = parseInt(req.query.page)  || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip  = (page - 1) * limit;

    const channel = await Channel.findById(channelId);
    if (!channel) return res.status(404).json({ message: "Channel not found" });

    if (channel.isPrivate) {
      const isMember = channel.members.some(m => m.user.toString() === req.user._id.toString());
      if (!isMember) return res.status(403).json({ message: "You are not a member of this private channel" });
    }

    const messages = await Message.find({ channel: channelId })
      .populate("sender", "name avatar email")
      .populate("replyTo", "content sender")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.json(messages.reverse());
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/channels/:channelId/messages
exports.sendMessage = async (req, res) => {
  try {
    const { channelId } = req.params;
    const { content, type = "text", replyTo } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ message: "Message content cannot be empty" });
    }

    const channel = await Channel.findById(channelId);
    if (!channel) return res.status(404).json({ message: "Channel not found" });

    if (channel.isPrivate) {
      const targetUserId = req.user._id.toString();
      const isMember = channel.members?.some(m => {
        const uId = m.user?._id || m.user;
        return uId && uId.toString() === targetUserId;
      });
      if (!isMember) return res.status(403).json({ message: "You are not a member of this private channel" });
    }

    const wsId = channel.workspace || req.body.workspaceId;

    const message = await Message.create({
      content: content.trim(),
      channel: channelId,
      sender: req.user._id,
      ...(wsId && { workspace: wsId }),
      messageType: type,
      replyTo: replyTo || null
    });

    await message.populate("sender", "name avatar email");
    if (replyTo) await message.populate("replyTo", "content sender");

    // ── Real-time: broadcast to channel room ──────────────────
    try {
      const obj = message.toObject();
      getIO().to(`ch:${channelId}`).emit("channel:newMessage", obj);
      getIO().to(`ch:${channelId}`).emit("message:created", obj);
    } catch {}

    res.status(201).json(message);
  } catch (err) {
    console.error("[sendMessage] error:", err);
    res.status(500).json({ message: err.message });
  }
};
