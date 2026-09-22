const DirectMessage = require("../models/DirectMessage");
const User = require("../models/User");
const { getIO } = require("../socket");

// GET /api/dm/:recipientId?workspaceId=xxx
exports.getDMs = async (req, res) => {
  try {
    const { recipientId } = req.params;
    const { workspaceId } = req.query;
    const page  = parseInt(req.query.page)  || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip  = (page - 1) * limit;

    let wsId = workspaceId;
    if (!wsId) {
      const Workspace = require("../models/workspace");
      const commonWs = await Workspace.findOne({
        $or: [{ owner: req.user._id }, { "members.userId": req.user._id }]
      });
      wsId = commonWs?._id;
    }

    const query = {
      ...(wsId && { workspace: wsId }),
      $or: [
        { sender: req.user._id, recipient: recipientId },
        { sender: recipientId, recipient: req.user._id }
      ]
    };

    const messages = await DirectMessage.find(query)
      .populate("sender",    "name avatar email")
      .populate("recipient", "name avatar email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.json(messages.reverse());
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/dm/:recipientId
exports.sendDM = async (req, res) => {
  try {
    const { recipientId } = req.params;
    const { content, workspaceId } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ message: "Message content cannot be empty" });
    }

    let wsId = workspaceId;
    if (!wsId) {
      const Workspace = require("../models/workspace");
      const commonWs = await Workspace.findOne({
        $or: [{ owner: req.user._id }, { "members.userId": req.user._id }]
      });
      wsId = commonWs?._id;
    }

    const recipient = await User.findById(recipientId);
    if (!recipient) return res.status(404).json({ message: "Recipient not found" });

    const message = await DirectMessage.create({
      content: content.trim(),
      sender:    req.user._id,
      recipient: recipientId,
      ...(wsId && { workspace: wsId })
    });

    await message.populate("sender",    "name avatar email");
    await message.populate("recipient", "name avatar email");

    // ── Real-time: emit to the DM room (both users) ───────────
    const dmKey = [req.user._id.toString(), recipientId].sort().join(":");
    try {
      getIO().to(`dm:${dmKey}`).emit("dm:newMessage", message.toObject());
    } catch {}

    res.status(201).json(message);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
