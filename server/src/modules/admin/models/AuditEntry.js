const mongoose = require('mongoose');

/** Append-only record of every moderation or admin action: who did what, to what, and when. Never edited or deleted. */
const auditSchema = new mongoose.Schema(
  {
    actorId: { type: String, required: true, index: true },
    actorName: { type: String, default: '' },
    actorRole: { type: String, default: '' },
    action: { type: String, required: true, maxlength: 60 }, // e.g. report.hide, user.suspend, category.create
    targetType: { type: String, default: '', maxlength: 40 },
    targetId: { type: String, default: '', maxlength: 100 },
    reportId: { type: String, default: '' },
    note: { type: String, default: '', maxlength: 500 },
  },
  { timestamps: { createdAt: true, updatedAt: false }, collection: 'admin_audit' },
);

auditSchema.index({ createdAt: -1 });

auditSchema.methods.toPublic = function toPublic() {
  return {
    id: String(this._id),
    actorId: this.actorId,
    actorName: this.actorName,
    actorRole: this.actorRole,
    action: this.action,
    targetType: this.targetType,
    targetId: this.targetId,
    reportId: this.reportId,
    note: this.note,
    at: this.createdAt,
  };
};

module.exports = mongoose.models.AdminAudit || mongoose.model('AdminAudit', auditSchema);
