const mongoose = require('mongoose');

const SPLIT_METHODS = ['equal', 'item', 'custom'];

const participantSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    verified: { type: Boolean, default: false },
    owedCents: { type: Number, required: true, min: 0 },
    paidCents: { type: Number, default: 0, min: 0 },
    settledAt: { type: Date, default: null },
  },
  { _id: false },
);

const billItemSchema = new mongoose.Schema(
  {
    label: { type: String, required: true, trim: true, maxlength: 120 },
    amountCents: { type: Number, required: true, min: 1 },
    sharedBy: { type: [String], default: [] },
  },
  { _id: false },
);

const paymentSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true },
    userName: { type: String, required: true, trim: true, maxlength: 100 },
    amountCents: { type: Number, required: true, min: 1 },
    note: { type: String, default: '', trim: true, maxlength: 200 },
    recordedBy: { type: String, required: true },
    recordedAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const billSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 140 },
    description: { type: String, default: '', trim: true, maxlength: 500 },
    totalCents: { type: Number, required: true, min: 1 },
    splitMethod: { type: String, enum: SPLIT_METHODS, default: 'equal' },
    creatorId: { type: String, required: true, index: true },
    creatorName: { type: String, required: true, trim: true, maxlength: 100 },
    dueDate: { type: Date, default: null },
    reminderSentAt: { type: Date, default: null },
    participants: { type: [participantSchema], default: [] },
    items: { type: [billItemSchema], default: [] },
    payments: { type: [paymentSchema], default: [] },
    status: { type: String, enum: ['open', 'settled'], default: 'open', index: true },
    hidden: { type: Boolean, default: false, index: true },
    hiddenAt: { type: Date, default: null },
    isSample: { type: Boolean, default: false },
  },
  { collection: 'campus_bills', timestamps: true },
);

billSchema.index({ 'participants.userId': 1 });

billSchema.methods.toPublic = function toPublic() {
  const paidTotalCents = (this.participants || []).reduce((sum, p) => sum + (p.paidCents || 0), 0);
  return {
    id: String(this._id),
    title: this.title,
    description: this.description || '',
    totalCents: this.totalCents,
    totalAmount: Number((this.totalCents / 100).toFixed(2)),
    paidTotalCents,
    paidTotalAmount: Number((paidTotalCents / 100).toFixed(2)),
    remainingCents: Math.max(0, this.totalCents - paidTotalCents),
    splitMethod: this.splitMethod,
    creatorId: this.creatorId,
    creatorName: this.creatorName,
    dueDate: this.dueDate || null,
    participants: (this.participants || []).map((p) => ({
      userId: p.userId,
      name: p.name,
      verified: Boolean(p.verified),
      owedCents: p.owedCents,
      owedAmount: Number((p.owedCents / 100).toFixed(2)),
      paidCents: p.paidCents || 0,
      paidAmount: Number(((p.paidCents || 0) / 100).toFixed(2)),
      balanceCents: Math.max(0, p.owedCents - (p.paidCents || 0)),
      balanceAmount: Number((Math.max(0, p.owedCents - (p.paidCents || 0)) / 100).toFixed(2)),
      settledAt: p.settledAt || null,
    })),
    items: (this.items || []).map((it) => ({
      label: it.label,
      amountCents: it.amountCents,
      amount: Number((it.amountCents / 100).toFixed(2)),
      sharedBy: it.sharedBy || [],
    })),
    payments: (this.payments || []).map((pay) => ({
      userId: pay.userId,
      userName: pay.userName,
      amountCents: pay.amountCents,
      amount: Number((pay.amountCents / 100).toFixed(2)),
      note: pay.note || '',
      recordedBy: pay.recordedBy,
      recordedAt: pay.recordedAt,
    })),
    status: this.status,
    isSample: Boolean(this.isSample),
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

module.exports = mongoose.models.CampusBill || mongoose.model('CampusBill', billSchema);
module.exports.SPLIT_METHODS = SPLIT_METHODS;
