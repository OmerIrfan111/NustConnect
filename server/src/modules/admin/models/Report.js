const mongoose = require('mongoose');

const REASONS = ['spam', 'abuse', 'inappropriate', 'misleading', 'other'];
const STATUSES = ['open', 'resolved', 'dismissed'];

const reportSchema = new mongoose.Schema(
  {
    targetType: { type: String, required: true, trim: true, lowercase: true, maxlength: 40 }, // e.g. 'ride', 'item'
    targetId: { type: String, required: true, trim: true, maxlength: 100 },
    reason: { type: String, enum: REASONS, default: 'other' },
    details: { type: String, default: '', trim: true, maxlength: 500 },
    reporterId: { type: String, required: true, index: true },
    status: { type: String, enum: STATUSES, default: 'open', index: true },
    action: { type: String, enum: ['none', 'hidden', 'restored'], default: 'none' },
    note: { type: String, default: '', maxlength: 500 },
    handledBy: { type: String, default: '' },
    handledAt: { type: Date, default: null },
  },
  { timestamps: true, collection: 'admin_reports' },
);

reportSchema.index({ targetType: 1, targetId: 1, reporterId: 1 });

reportSchema.methods.toPublic = function toPublic() {
  return {
    id: String(this._id),
    targetType: this.targetType,
    targetId: this.targetId,
    reason: this.reason,
    details: this.details,
    status: this.status,
    action: this.action || 'none',
    note: this.note || '',
    handledAt: this.handledAt,
    createdAt: this.createdAt,
  };
};

module.exports = mongoose.models.AdminReport || mongoose.model('AdminReport', reportSchema);
module.exports.REASONS = REASONS;
module.exports.STATUSES = STATUSES;
