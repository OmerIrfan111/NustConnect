const mongoose = require('mongoose');

const CLAIM_STATUSES = ['pending', 'approved', 'rejected', 'cancelled'];

const claimSchema = new mongoose.Schema(
  {
    itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'LostFoundItem', required: true, index: true },
    claimantId: { type: String, required: true, index: true },
    claimantName: { type: String, required: true, trim: true, maxlength: 100 },
    claimantVerified: { type: Boolean, default: false },
    message: { type: String, required: true, trim: true, maxlength: 1000 },
    status: { type: String, enum: CLAIM_STATUSES, default: 'pending', index: true },
    decisionNote: { type: String, default: '', trim: true, maxlength: 500 },
    decidedAt: { type: Date, default: null },
  },
  { collection: 'lostfound_claims', timestamps: true },
);

claimSchema.methods.toPublic = function toPublic() {
  return {
    id: String(this._id),
    itemId: String(this.itemId),
    claimantId: this.claimantId,
    claimantName: this.claimantName,
    claimantVerified: Boolean(this.claimantVerified),
    message: this.message,
    status: this.status,
    decisionNote: this.decisionNote || '',
    decidedAt: this.decidedAt,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

module.exports = mongoose.models.LostFoundClaim || mongoose.model('LostFoundClaim', claimSchema);
module.exports.CLAIM_STATUSES = CLAIM_STATUSES;
