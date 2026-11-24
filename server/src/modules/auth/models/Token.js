const mongoose = require('mongoose');

const TYPES = ['verify', 'reset'];

/** One-time tokens for email verification and password reset. Only a SHA-256 hash is stored, never the token itself. */
const tokenSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    type: { type: String, enum: TYPES, required: true },
    tokenHash: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
    usedAt: { type: Date, default: null },
  },
  { timestamps: true, collection: 'auth_tokens' },
);

// MongoDB removes expired tokens automatically.
tokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.models.AuthToken || mongoose.model('AuthToken', tokenSchema);
module.exports.TYPES = TYPES;
