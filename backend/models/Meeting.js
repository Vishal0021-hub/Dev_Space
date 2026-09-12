const mongoose = require("mongoose");

const meetingSchema = new mongoose.Schema(
  {
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
      index: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
    },

    date: {
      type: Date,
      default: Date.now,
    },

    attendees: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    /* Tiptap JSON document — stored as-is */
    contentJson: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },

    /* Task IDs extracted from @task mentions in contentJson */
    linkedTasks: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Task",
      },
    ],

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

/* Compound index for fast workspace queries sorted by date */
meetingSchema.index({ workspaceId: 1, date: -1 });

/* Index for backlink queries (find meetings that mention a task) */
meetingSchema.index({ linkedTasks: 1 });

module.exports =
  mongoose.models.Meeting || mongoose.model("Meeting", meetingSchema);
