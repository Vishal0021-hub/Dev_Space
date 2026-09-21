const mongoose = require("mongoose");

const workspaceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true
    },

    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },

    members: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User"
        },
        role: {
          type: String,
          enum: ["owner", "admin", "member"],
          default: "member"
        },
        joinedAt: {
          type: Date,
          default: Date.now
        }
      }
    ],

    /* ── GitHub Repo Link ────────────────────────────────────── */
    github: {
      repoOwner:    { type: String },
      repoName:     { type: String },
      repoFullName: { type: String },
      repoUrl:      { type: String },
      defaultBranch: { type: String, default: "main" },
      webhookId:    { type: Number },          // GitHub webhook ID for deletion
      linkedBy:     { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      linkedAt:     { type: Date },
    },
  },
  { timestamps: true }
);

workspaceSchema.index({ "members.userId": 1 });
workspaceSchema.index({ owner: 1 });

module.exports = mongoose.models.Workspace || mongoose.model("Workspace", workspaceSchema);