const mongoose = require("mongoose");

const standupConfigSchema = new mongoose.Schema(
  {
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
      unique: true,
    },

    enabled: {
      type: Boolean,
      default: true,
    },

    questions: {
      type: [String],
      default: [
        "What did you work on?",
        "What will you work on next?",
        "Any blockers?",
      ],
    },

    /* Digest email schedule */
    digestDay: {
      type: Number,
      default: 1, // 0=Sun, 1=Mon, ..., 6=Sat
      min: 0,
      max: 6,
    },

    digestHourUTC: {
      type: Number,
      default: 8,
      min: 0,
      max: 23,
    },

    digestRecipients: {
      type: String,
      enum: ["owners_admins", "all"],
      default: "owners_admins",
    },
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.StandupConfig ||
  mongoose.model("StandupConfig", standupConfigSchema);
