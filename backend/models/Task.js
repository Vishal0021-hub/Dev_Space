const mongoose = require("mongoose");



const taskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true
    },

    description: String,

    board: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Board"
    },

    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium"
    },

    status: {
      type: String,
      enum: ["todo", "inprogress", "review", "done"],
      default: "todo"
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    dueDate: {
      type: Date,
      default: null
    },

    attachments: [
      {
        url:        { type: String, required: true },
        publicId:   { type: String, required: true },
        filename:   { type: String, required: true },
        mimetype:   { type: String, required: true },
        size:       { type: Number, required: true },
        uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        uploadedAt: { type: Date, default: Date.now },
      }
    ],

    /* ── Dependencies ───────────────────────────────────────── */
    blockedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Task' }],
    blocking:  [{ type: mongoose.Schema.Types.ObjectId, ref: 'Task' }],

    /* ── Read-Only GitHub Links ─────────────────────────────── */
    githubLinks: [{
      url: String,
      type: { type: String, enum: ['pr', 'commit', 'issue'], default: 'pr' },
      meta: {
        title: String,
        number: Number,
        state: String,
        author: String,
        fetchedAt: Date
      }
    }],

    /* ── Standup Blocker Flags ────────────────────────────────── */
    flags: [{
      type:       { type: String, enum: ['blocker'], default: 'blocker' },
      reason:     { type: String },
      reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      reportedAt: { type: Date, default: Date.now },
      resolved:   { type: Boolean, default: false },
      resolvedAt: { type: Date, default: null },
      resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    }]
  },
  { timestamps: true }
);

module.exports = mongoose.models.Task || mongoose.model("Task", taskSchema);