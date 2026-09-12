const mongoose = require("mongoose");
const Meeting = require("../models/Meeting");
const { logActivity } = require("../utils/activityLogger");

/* ── Helper: extract @task mention IDs from Tiptap JSON ──────── */
function extractTaskMentions(doc) {
  const ids = new Set();
  if (!doc || typeof doc !== "object") return [];

  function walk(node) {
    if (!node) return;
    // Tiptap mention nodes have type "mention" and attrs.id
    if (node.type === "mention" && node.attrs?.id) {
      if (mongoose.isValidObjectId(node.attrs.id)) {
        ids.add(node.attrs.id);
      }
    }
    if (Array.isArray(node.content)) {
      node.content.forEach(walk);
    }
  }

  walk(doc);
  return [...ids];
}

/* ── Create Meeting ──────────────────────────────────────────── */
exports.createMeeting = async (req, res) => {
  try {
    const { workspaceId, title, date, attendees, contentJson } = req.body;

    if (!workspaceId || !title) {
      return res.status(400).json({ message: "workspaceId and title are required" });
    }

    const linkedTasks = extractTaskMentions(contentJson);

    const meeting = await Meeting.create({
      workspaceId,
      title: title.trim(),
      date: date || new Date(),
      attendees: attendees || [],
      contentJson: contentJson || null,
      linkedTasks,
      createdBy: req.user._id,
    });

    await logActivity(workspaceId, req.user._id, "meeting_created", {
      meetingTitle: meeting.title,
    });

    const populated = await Meeting.findById(meeting._id)
      .populate("attendees", "name email avatar")
      .populate("linkedTasks", "title status")
      .populate("createdBy", "name avatar");

    res.status(201).json(populated);
  } catch (err) {
    console.error("[meetingController] createMeeting error:", err.message);
    res.status(500).json({ message: err.message });
  }
};

/* ── Get Meetings for Workspace (paginated) ──────────────────── */
exports.getMeetings = async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, parseInt(req.query.limit) || 20);
    const skip = (page - 1) * limit;

    const [meetings, total] = await Promise.all([
      Meeting.find({ workspaceId })
        .populate("attendees", "name email avatar")
        .populate("linkedTasks", "title status")
        .populate("createdBy", "name avatar")
        .sort({ date: -1 })
        .skip(skip)
        .limit(limit),
      Meeting.countDocuments({ workspaceId }),
    ]);

    res.json({ meetings, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ── Get Single Meeting ──────────────────────────────────────── */
exports.getMeeting = async (req, res) => {
  try {
    const meeting = await Meeting.findById(req.params.meetingId)
      .populate("attendees", "name email avatar")
      .populate("linkedTasks", "title status priority assignedTo")
      .populate("createdBy", "name avatar");

    if (!meeting) return res.status(404).json({ message: "Meeting not found" });
    res.json(meeting);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ── Update Meeting ──────────────────────────────────────────── */
exports.updateMeeting = async (req, res) => {
  try {
    const { title, date, attendees, contentJson } = req.body;
    const meeting = await Meeting.findById(req.params.meetingId);
    if (!meeting) return res.status(404).json({ message: "Meeting not found" });

    if (title !== undefined) meeting.title = title.trim();
    if (date !== undefined) meeting.date = date;
    if (attendees !== undefined) meeting.attendees = attendees;
    if (contentJson !== undefined) {
      meeting.contentJson = contentJson;
      meeting.linkedTasks = extractTaskMentions(contentJson);
    }

    await meeting.save();

    const populated = await Meeting.findById(meeting._id)
      .populate("attendees", "name email avatar")
      .populate("linkedTasks", "title status")
      .populate("createdBy", "name avatar");

    res.json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ── Delete Meeting ──────────────────────────────────────────── */
exports.deleteMeeting = async (req, res) => {
  try {
    const meeting = await Meeting.findById(req.params.meetingId);
    if (!meeting) return res.status(404).json({ message: "Meeting not found" });

    await Meeting.findByIdAndDelete(req.params.meetingId);

    await logActivity(meeting.workspaceId, req.user._id, "meeting_deleted", {
      meetingTitle: meeting.title,
    });

    res.json({ message: "Meeting deleted", meetingId: req.params.meetingId });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ── Get Meetings by Task (backlinks) ────────────────────────── */
exports.getMeetingsByTask = async (req, res) => {
  try {
    const { taskId } = req.params;
    if (!mongoose.isValidObjectId(taskId)) {
      return res.status(400).json({ message: "Invalid taskId" });
    }

    const meetings = await Meeting.find({ linkedTasks: taskId })
      .populate("createdBy", "name avatar")
      .populate("attendees", "name avatar")
      .select("title date attendees createdBy createdAt")
      .sort({ date: -1 })
      .limit(50);

    res.json(meetings);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
