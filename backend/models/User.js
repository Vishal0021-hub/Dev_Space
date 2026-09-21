const mongoose = require('mongoose');

const userschema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      validate: {
        validator: (v) => /^[a-zA-Z0-9._%+\-]+@gmail\.com$/i.test(v),
        message: 'Only Gmail accounts (@gmail.com) are allowed to register.',
      },
    },
    password: {
      type: String,
      required: true,
    },
    avatar: {
      type: String,
    },

    /* ── GitHub OAuth connection ─────────────────────────────── */
    github: {
      accessToken: { type: String },   // AES-256-CBC encrypted
      tokenIv:     { type: String },   // IV for decryption
      login:       { type: String },   // GitHub username
      avatarUrl:   { type: String },
      connectedAt: { type: Date },
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: function (doc, ret) {
        delete ret.password;
        if (ret.github) {
          delete ret.github.accessToken;
          delete ret.github.tokenIv;
        }
        return ret;
      },
    },
    toObject: {
      transform: function (doc, ret) {
        delete ret.password;
        if (ret.github) {
          delete ret.github.accessToken;
          delete ret.github.tokenIv;
        }
        return ret;
      },
    },
  }
);

module.exports = mongoose.models.User || mongoose.model('User', userschema);