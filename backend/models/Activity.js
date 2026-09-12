const mongoose = require("mongoose");

const activitySchema = new mongoose.Schema(
  {
    workspace: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
      required: true
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    // action / event type
    type: {
      type: String,
      enum: [
        "task_created",
        "task_moved",
        "task_assigned",
        "task_status_changed",
        "task_deleted",
        "member_invited",
        "member_joined",
        "role_changed",
        "project_created",
        "comment_added",
        "meeting_created",
        "meeting_deleted",
        "standup_submitted",
        "workspace_updated"
      ],
      required: true
    },
    // Spec fields: entityType + entityId
    entityType: {
      type: String,
      enum: ["task", "project", "board", "channel", "workspace", "comment", "meeting", "standup"],
      default: null
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null
    },
    // Flexible meta payload (replaces old `details` — kept for BC)
    meta: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    // Legacy details field — kept for backward compatibility
    details: {
      taskTitle: String,
      projectName: String,
      invitedEmail: String,
      oldRole: String,
      newRole: String,
      fromBoard: String,
      toBoard: String,
      assignedToName: String,
      oldStatus: String,
      newStatus: String
    }
  },
  { timestamps: true }
);

// Indexes for fast queries
activitySchema.index({ workspace: 1, createdAt: -1 });
activitySchema.index({ user: 1, createdAt: -1 });
activitySchema.index({ entityType: 1, entityId: 1 });

module.exports = mongoose.models.Activity || mongoose.model("Activity", activitySchema);
