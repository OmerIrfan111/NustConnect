const mongoose = require('mongoose');

const complaintHistorySchema = new mongoose.Schema(
  {
    complaintId: { type: mongoose.Schema.Types.ObjectId, ref: 'SupportComplaint', required: true, index: true },
    fromStatus: { type: String, default: '' },
    toStatus: { type: String, required: true },
    actorId: { type: String, required: true },
    actorName: { type: String, required: true, trim: true, maxlength: 100 },
    actorRole: { type: String, default: 'student' },
    note: { type: String, default: '', trim: true, maxlength: 500 },
  },
  { collection: 'support_complaint_history', timestamps: true },
);

complaintHistorySchema.methods.toPublic = function toPublic() {
  return {
    id: String(this._id),
    complaintId: String(this.complaintId),
    fromStatus: this.fromStatus || '',
    toStatus: this.toStatus,
    actorId: this.actorId,
    actorName: this.actorName,
    actorRole: this.actorRole,
    note: this.note || '',
    createdAt: this.createdAt,
  };
};

module.exports =
  mongoose.models.SupportComplaintHistory || mongoose.model('SupportComplaintHistory', complaintHistorySchema);
