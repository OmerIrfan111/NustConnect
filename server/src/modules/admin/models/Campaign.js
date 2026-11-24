const mongoose = require('mongoose');
const { progressPercent } = require('../progress');

const STATUSES = ['draft', 'active', 'closed'];

const campaignSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, default: '', trim: true, maxlength: 2000 },
    goalAmount: { type: Number, required: true, min: 1 }, // PKR
    // Phase 1: set by the admin. Phase 2 derives it from the sum of admin_contributions.
    raisedAmount: { type: Number, default: 0, min: 0 },
    deadline: { type: Date, default: null },
    status: { type: String, enum: STATUSES, default: 'active', index: true },
    createdBy: { type: String, default: '' },
    sample: { type: Boolean, default: false }, // seeded demo rows, shown as sample data
  },
  { timestamps: true, collection: 'admin_campaigns' },
);

campaignSchema.methods.toPublic = function toPublic() {
  return {
    id: String(this._id),
    title: this.title,
    description: this.description,
    goalAmount: this.goalAmount,
    raisedAmount: this.raisedAmount,
    progress: progressPercent(this.raisedAmount, this.goalAmount),
    deadline: this.deadline,
    status: this.status,
    sample: this.sample,
    createdAt: this.createdAt,
  };
};

module.exports = mongoose.models.AdminCampaign || mongoose.model('AdminCampaign', campaignSchema);
module.exports.STATUSES = STATUSES;
