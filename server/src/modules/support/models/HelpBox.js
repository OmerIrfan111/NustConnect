const mongoose = require('mongoose');

const HELPBOX_CATEGORIES = ['academics', 'hostels', 'transport', 'mental_health', 'administration', 'campus_life', 'other'];
const HELPBOX_STATUSES = ['open', 'answered', 'dismissed'];

/**
 * Privacy invariant (CLAUDE.md §2.7, PROJECT_PLAN §8 C2):
 * HelpBox documents MUST NEVER store userId, email, IP address, or any identity field.
 */
const helpBoxSchema = new mongoose.Schema(
  {
    category: { type: String, enum: HELPBOX_CATEGORIES, default: 'other', index: true },
    question: { type: String, required: true, trim: true, maxlength: 1500 },
    status: { type: String, enum: HELPBOX_STATUSES, default: 'open', index: true },
    answer: { type: String, default: '', trim: true, maxlength: 3000 },
    answeredByRole: { type: String, default: '' },
    answeredAt: { type: Date, default: null },
    publishedFaqId: { type: String, default: '' },
    isSample: { type: Boolean, default: false },
  },
  { collection: 'support_helpbox', timestamps: true, strict: 'throw' },
);

helpBoxSchema.methods.toPublic = function toPublic() {
  return {
    id: String(this._id),
    category: this.category,
    question: this.question,
    status: this.status,
    answer: this.answer || '',
    answeredAt: this.answeredAt || null,
    publishedFaqId: this.publishedFaqId || '',
    isSample: Boolean(this.isSample),
    createdAt: this.createdAt,
  };
};

module.exports = mongoose.models.SupportHelpBox || mongoose.model('SupportHelpBox', helpBoxSchema);
module.exports.HELPBOX_CATEGORIES = HELPBOX_CATEGORIES;
module.exports.HELPBOX_STATUSES = HELPBOX_STATUSES;
