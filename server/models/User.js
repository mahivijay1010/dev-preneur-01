const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    passwordHash: { type: String, required: true, select: false },
    provider: { type: String, enum: ['email'], default: 'email' },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    consentAcceptedAt: { type: Date, default: null },
    avatarUrl: { type: String, default: null },
    appState: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true, minimize: false },
);

module.exports = mongoose.model('User', userSchema);
