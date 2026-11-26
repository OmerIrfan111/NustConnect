const mongoose = require('mongoose');

const CATEGORIES = ['id_card', 'electronics', 'books', 'keys', 'accessories', 'documents', 'other'];
const STATUSES = ['open', 'claimed', 'returned'];
const OCR_STATUSES = ['none', 'completed', 'failed', 'manual'];

const DEFAULT_ARCHIVE_DAYS = 90;

const itemSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ['lost', 'found'], required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, required: true, trim: true, maxlength: 2000 },
    category: { type: String, enum: CATEGORIES, default: 'other', index: true },
    location: { type: String, required: true, trim: true, maxlength: 160 },
    eventDate: { type: Date, required: true, index: true },
    photos: { type: [String], default: [] },
    status: { type: String, enum: STATUSES, default: 'open', index: true },
    ownerId: { type: String, required: true, index: true },
    ownerName: { type: String, required: true, trim: true, maxlength: 100 },
    ownerVerified: { type: Boolean, default: false },
    // Privacy rule (CLAUDE.md §2.7): OCR text is masked and never returned raw in any API response.
    ocrTextMasked: { type: String, default: '', select: false },
    ocrKeywords: { type: [String], default: [] },
    ocrStatus: { type: String, enum: OCR_STATUSES, default: 'none' },
    manualKeywords: { type: String, default: '', trim: true, maxlength: 300 },
    isSample: { type: Boolean, default: false },
    hidden: { type: Boolean, default: false, index: true },
    hiddenAt: { type: Date, default: null },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + DEFAULT_ARCHIVE_DAYS * 24 * 60 * 60 * 1000),
      index: true,
    },
  },
  { collection: 'lostfound_items', timestamps: true },
);

itemSchema.index({ title: 'text', description: 'text', location: 'text', manualKeywords: 'text' });

itemSchema.methods.toPublic = function toPublic() {
  return {
    id: String(this._id),
    type: this.type,
    title: this.title,
    description: this.description,
    category: this.category,
    location: this.location,
    eventDate: this.eventDate,
    photos: Array.isArray(this.photos) ? this.photos : [],
    status: this.status,
    ownerId: this.ownerId,
    ownerName: this.ownerName,
    ownerVerified: Boolean(this.ownerVerified),
    ocrStatus: this.ocrStatus,
    manualKeywords: this.manualKeywords || '',
    isSample: Boolean(this.isSample),
    hidden: Boolean(this.hidden),
    expiresAt: this.expiresAt,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

module.exports = mongoose.models.LostFoundItem || mongoose.model('LostFoundItem', itemSchema);
module.exports.CATEGORIES = CATEGORIES;
module.exports.STATUSES = STATUSES;
module.exports.OCR_STATUSES = OCR_STATUSES;
module.exports.DEFAULT_ARCHIVE_DAYS = DEFAULT_ARCHIVE_DAYS;
