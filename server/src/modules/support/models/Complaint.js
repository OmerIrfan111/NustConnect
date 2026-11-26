const mongoose = require('mongoose');

const COMPLAINT_CATEGORIES = [
  'electrical',
  'plumbing',
  'internet',
  'hostel',
  'classroom',
  'cleanliness',
  'security',
  'other',
];

const COMPLAINT_STATUSES = ['submitted', 'under_review', 'assigned', 'in_progress', 'resolved', 'reopened'];

const ALLOWED_TRANSITIONS = {
  submitted: ['under_review', 'assigned', 'in_progress', 'resolved'],
  under_review: ['assigned', 'in_progress', 'resolved'],
  assigned: ['in_progress', 'resolved'],
  in_progress: ['resolved'],
  resolved: ['reopened'],
  reopened: ['under_review', 'assigned', 'in_progress', 'resolved'],
};

const complaintSchema = new mongoose.Schema(
  {
    ownerId: { type: String, required: true, index: true },
    ownerName: { type: String, required: true, trim: true, maxlength: 100 },
    category: { type: String, enum: COMPLAINT_CATEGORIES, default: 'other', index: true },
    title: { type: String, required: true, trim: true, maxlength: 140 },
    description: { type: String, required: true, trim: true, maxlength: 2000 },
    location: { type: String, required: true, trim: true, maxlength: 160 },
    photo: { type: String, default: '' },
    status: { type: String, enum: COMPLAINT_STATUSES, default: 'submitted', index: true },
    assignedTo: { type: String, default: '', trim: true, maxlength: 120 },
    isSample: { type: Boolean, default: false },
  },
  { collection: 'support_complaints', timestamps: true },
);

complaintSchema.methods.toPublic = function toPublic() {
  return {
    id: String(this._id),
    ownerId: this.ownerId,
    ownerName: this.ownerName,
    category: this.category,
    title: this.title,
    description: this.description,
    location: this.location,
    photo: this.photo || '',
    status: this.status,
    assignedTo: this.assignedTo || '',
    isSample: Boolean(this.isSample),
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

module.exports = mongoose.models.SupportComplaint || mongoose.model('SupportComplaint', complaintSchema);
module.exports.COMPLAINT_CATEGORIES = COMPLAINT_CATEGORIES;
module.exports.COMPLAINT_STATUSES = COMPLAINT_STATUSES;
module.exports.ALLOWED_TRANSITIONS = ALLOWED_TRANSITIONS;
