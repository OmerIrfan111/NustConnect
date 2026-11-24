const mongoose = require('mongoose');

/** A pledge recorded by an admin (no payment gateway). The campaign total is always the sum of these records. */
const contributionSchema = new mongoose.Schema(
  {
    campaignId: { type: String, required: true, index: true },
    donorName: { type: String, default: '', trim: true, maxlength: 80 }, // visible to admins only
    anonymous: { type: Boolean, default: false },
    amount: { type: Number, required: true, min: 1 },
    note: { type: String, default: '', trim: true, maxlength: 200 },
    recordedBy: { type: String, default: '' },
    sample: { type: Boolean, default: false },
  },
  { timestamps: true, collection: 'admin_contributions' },
);

contributionSchema.methods.toPublic = function toPublic() {
  return {
    id: String(this._id),
    campaignId: this.campaignId,
    donorName: this.anonymous ? '' : this.donorName,
    anonymous: this.anonymous || !this.donorName,
    amount: this.amount,
    note: this.note,
    createdAt: this.createdAt,
  };
};

module.exports = mongoose.models.AdminContribution || mongoose.model('AdminContribution', contributionSchema);
