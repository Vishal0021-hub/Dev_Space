const mongoose = require("mongoose");
const StandupConfig = require("../models/StandupConfig");
const StandupEntry = require("../models/StandupEntry");
const Task = require("../models/Task");
const Workspace = require("../models/workspace");
const { logActivity } = require("../utils/activityLogger");

/* ── Get Standup Config ──────────────────────────────────────── */
exports.getConfig = async (req, res) => {
  try {
    const { workspaceId } = req.params;
    let config = await StandupConfig.findOne({ workspaceId });

    // Auto-create default config if none exists
    if (!config) {
      config = await StandupConfig.create({ workspaceId });
    }

    res.json(config);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ── Update Standup Config (admin only) ──────────────────────── */
exports.updateConfig = async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const { enabled, questions, digestDay, digestHourUTC, digestRecipients } = req.body;

    const update = {};
    if (enabled !== undefined) update.enabled = enabled;
    if (questions !== undefined) update.questions = questions;
    if (digestDay !== undefined) update.digestDay = digestDay;
    if (digestHourUTC !== undefined) update.digestHourUTC = digestHourUTC;
    if (digestRecipients !== undefined) update.digestRecipients = digestRecipients;

    const config = await StandupConfig.findOneAndUpdate(
      { workspaceId },
      { $set: update },
      { new: true, upsert: true }
    );

    res.json(config);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ── Submit Standup Entry (upsert) ───────────────────────────── */
exports.submitEntry = async (req, res) => {
  try {
    const { workspaceId, answers, blockers } = req.body;
    if (!workspaceId) return res.status(400).json({ message: "workspaceId is required" });

    // Today's date string in UTC
    const date = req.body.date || new Date().toISOString().slice(0, 10);

    const entry = await StandupEntry.findOneAndUpdate(
      { workspaceId, userId: req.user._id, date },
      {
        $set: {
          answers: answers || [],
          blockers: blockers || [],
        },
      },
      { new: true, upsert: true }
    );

    /* ── Blocker auto-flag: push flags into linked tasks ──── */
    if (blockers && blockers.length > 0) {
      for (const blocker of blockers) {
        if (blocker.taskId && mongoose.isValidObjectId(blocker.taskId)) {
          const task = await Task.findById(blocker.taskId);
          if (task) {
            // Avoid duplicate flags from the same user on the same day
            const alreadyFlagged = task.flags?.some(
              (f) =>
                f.reportedBy?.toString() === req.user._id.toString() &&
                !f.resolved &&
                f.reason === blocker.description
            );
            if (!alreadyFlagged) {
              task.flags = task.flags || [];
              task.flags.push({
                type: "blocker",
                reason: blocker.description,
                reportedBy: req.user._id,
                reportedAt: new Date(),
              });
              await task.save();
            }
          }
        }
      }
    }

    await logActivity(workspaceId, req.user._id, "standup_submitted", {
      date,
      blockerCount: (blockers || []).length,
    });

    // Return populated entry
    const populated = await StandupEntry.findById(entry._id)
      .populate("userId", "name email avatar")
      .populate("answers.linkedTasks", "title status")
      .populate("blockers.taskId", "title status");

    res.json(populated);
  } catch (err) {
    // Handle duplicate key error gracefully
    if (err.code === 11000) {
      return res.status(409).json({ message: "Standup already submitted for today. Use upsert." });
    }
    console.error("[standupController] submitEntry error:", err.message);
    res.status(500).json({ message: err.message });
  }
};

/* ── Get Entries for Workspace (by date) ─────────────────────── */
exports.getEntries = async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const date = req.query.date || new Date().toISOString().slice(0, 10);

    const entries = await StandupEntry.find({ workspaceId, date })
      .populate("userId", "name email avatar")
      .populate("answers.linkedTasks", "title status")
      .populate("blockers.taskId", "title status")
      .sort({ createdAt: -1 });

    res.json(entries);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ── Get My Entry for Today ──────────────────────────────────── */
exports.getMyEntry = async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const date = req.query.date || new Date().toISOString().slice(0, 10);

    const entry = await StandupEntry.findOne({ workspaceId, userId: req.user._id, date })
      .populate("answers.linkedTasks", "title status")
      .populate("blockers.taskId", "title status");

    res.json(entry); // null if not submitted
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ── Get Missing Members (who haven't submitted today) ───────── */
exports.getMissingMembers = async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const date = req.query.date || new Date().toISOString().slice(0, 10);

    const workspace = await Workspace.findById(workspaceId).populate("members.userId", "name email avatar");
    if (!workspace) return res.status(404).json({ message: "Workspace not found" });

    const submittedUserIds = await StandupEntry.find({ workspaceId, date })
      .distinct("userId");

    const submittedSet = new Set(submittedUserIds.map(id => id.toString()));

    const missing = workspace.members
      .filter(m => m.userId && !submittedSet.has(m.userId._id.toString()))
      .map(m => ({
        _id: m.userId._id,
        name: m.userId.name,
        email: m.userId.email,
        avatar: m.userId.avatar,
        role: m.role,
      }));

    res.json({ date, missing, total: workspace.members.length, submitted: submittedSet.size });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ── Get History (for heatmap) ───────────────────────────────── */
exports.getHistory = async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const userId = req.query.userId || req.user._id;
    const days = Math.min(365, parseInt(req.query.days) || 90);

    const since = new Date();
    since.setDate(since.getDate() - days);
    const sinceStr = since.toISOString().slice(0, 10);

    const entries = await StandupEntry.find({
      workspaceId,
      userId,
      date: { $gte: sinceStr },
    })
      .select("date blockers")
      .sort({ date: 1 });

    // Return as a map: { "YYYY-MM-DD": { submitted: true, blockerCount: N } }
    const heatmap = {};
    for (const e of entries) {
      heatmap[e.date] = {
        submitted: true,
        blockerCount: e.blockers?.length || 0,
      };
    }

    res.json({ userId, days, heatmap });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
