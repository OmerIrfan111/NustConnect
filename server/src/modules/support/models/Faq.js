const mongoose = require('mongoose');

const FAQ_CATEGORIES = ['academics', 'hostels', 'transport', 'it_lms', 'fees_scholarships', 'campus_life', 'general'];

const faqSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 180 },
    category: { type: String, enum: FAQ_CATEGORIES, default: 'general', index: true },
    body: { type: String, required: true, trim: true, maxlength: 6000 },
    tags: { type: [String], default: [] },
    hidden: { type: Boolean, default: false, index: true },
    hiddenAt: { type: Date, default: null },
    isSample: { type: Boolean, default: false },
  },
  { collection: 'support_faq', timestamps: true },
);

faqSchema.methods.toPublic = function toPublic() {
  return {
    id: String(this._id),
    title: this.title,
    category: this.category,
    body: this.body,
    tags: Array.isArray(this.tags) ? this.tags : [],
    hidden: Boolean(this.hidden),
    isSample: Boolean(this.isSample),
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

module.exports = mongoose.models.SupportFaq || mongoose.model('SupportFaq', faqSchema);
module.exports.FAQ_CATEGORIES = FAQ_CATEGORIES;
