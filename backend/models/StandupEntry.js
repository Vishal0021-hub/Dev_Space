const mongoose = require("mongoose");

const blockerSubSchema = new mongoose.Schema(
  {
    description: { type: String, required: true },
    taskId: { type: mongoose.Schema.Types.ObjectId, ref: "Task", default: null },
    resolved: { type: Boolean, default: false },
    resolvedAt: { type: Date, default: null },
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { _id: true }
);

const answerSubSchema = new mongoose.Schema(
  {
    question: { type: String, required: true },
    text: { type: String, default: "" },
    linkedTasks: [{ type: mongoose.Schema.Types.ObjectId, ref: "Task" }],
  },
  { _id: false }
);

const standupEntrySchema = new mongoose.Schema(
  {
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    /* "YYYY-MM-DD" string — used in unique compound index */
    date: {
      type: String,
      required: true,
    },

    answers: [answerSubSchema],

    blockers: [blockerSubSchema],
  },
  { timestamps: true }
);

/* Unique compound index: one entry per user per day per workspace */
standupEntrySchema.index({ workspaceId: 1, userId: 1, date: 1 }, { unique: true });

/* For querying all entries in a workspace on a given date */
standupEntrySchema.index({ workspaceId: 1, date: 1 });

/* For heatmap queries (user's history) */
standupEntrySchema.index({ workspaceId: 1, userId: 1, date: -1 });

module.exports =
  mongoose.models.StandupEntry ||
  mongoose.model("StandupEntry", standupEntrySchema);
