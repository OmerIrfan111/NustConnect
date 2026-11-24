const mongoose = require('mongoose');

const ROLES = ['student', 'alumni', 'moderator', 'admin'];

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    department: { type: String, required: true, trim: true, maxlength: 60 },
    batch: { type: String, required: true, trim: true, maxlength: 10 },
    role: { type: String, enum: ROLES, default: 'student' },
    // Phase 1 marks accounts verified at registration (domain rule only). Phase 2 replaces this with the email-link flow.
    verified: { type: Boolean, default: false },
    suspended: { type: Boolean, default: false }, // set by A3 moderation (Phase 2)
  },
  { timestamps: true, collection: 'auth_users' },
);

/** The only shape ever sent to a client. Never includes the password hash. */
userSchema.methods.toPublic = function toPublic() {
  return {
    id: String(this._id),
    name: this.name,
    email: this.email,
    role: this.role,
    verified: this.verified,
    department: this.department,
    batch: this.batch,
  };
};

module.exports = mongoose.models.AuthUser || mongoose.model('AuthUser', userSchema);
module.exports.ROLES = ROLES;
