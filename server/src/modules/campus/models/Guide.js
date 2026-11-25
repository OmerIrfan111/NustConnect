const mongoose = require('mongoose');

const GUIDE_SECTIONS = ['first_week', 'academics', 'hostels', 'transport', 'clubs', 'safety', 'facilities'];

const SAMPLE_GUIDES = [
  {
    id: 'sample-guide-1',
    title: 'First Week Checklist for NUST H-12 Freshies',
    section: 'first_week',
    summary: 'Everything to complete in your first 5 days: student ID card, LMS login, eduroam Wi-Fi, and library activation.',
    body: 'Collect your temporary pass at Gate 1, visit your school student affairs office for biometric verification, activate your @students.nust.edu.pk credentials, and connect to eduroam using your full institutional email.',
    order: 1,
    isSample: true,
  },
  {
    id: 'sample-guide-2',
    title: 'Getting Around Campus: Shuttles & Gates',
    section: 'transport',
    summary: 'Shuttle routes, timings, and walking shortcuts between SEECS, NBS, Library, and Hostels.',
    body: 'Internal campus shuttles run continuously during class hours between Gate 1, Gate 2, Concordia 1, Central Library, SEECS, and Hostel blocks. Gate 4 connects conveniently toward Sector H-13.',
    order: 2,
    isSample: true,
  },
  {
    id: 'sample-guide-3',
    title: 'Hostel & Mess Essentials',
    section: 'hostels',
    summary: 'Mess registration deadlines, curfew notes, laundry, and maintenance reporting.',
    body: 'Mess off requests must be submitted before the daily cutoff. Use the Facility Complaint Tracker on NUSTConnect to report room electrical, plumbing, or Wi-Fi issues with photo evidence.',
    order: 3,
    isSample: true,
  },
  {
    id: 'sample-guide-4',
    title: 'Campus Dining & Study Spots',
    section: 'facilities',
    summary: 'Concordia 1 & 2, Retro, school tuck shops, and late-evening study spaces.',
    body: 'Central Library offers silent halls and reservable group discussion rooms. Concordia 1 & 2 host affordable lunch spots, stationery shops, and photocopy counters.',
    order: 4,
    isSample: true,
  },
];

const guideSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 160 },
    section: { type: String, enum: GUIDE_SECTIONS, default: 'first_week', index: true },
    summary: { type: String, required: true, trim: true, maxlength: 300 },
    body: { type: String, required: true, trim: true, maxlength: 5000 },
    order: { type: Number, default: 10 },
    hidden: { type: Boolean, default: false, index: true },
    isSample: { type: Boolean, default: false },
  },
  { collection: 'campus_guides', timestamps: true },
);

guideSchema.methods.toPublic = function toPublic() {
  return {
    id: String(this._id),
    title: this.title,
    section: this.section,
    summary: this.summary,
    body: this.body,
    order: this.order,
    isSample: Boolean(this.isSample),
  };
};

module.exports = mongoose.models.CampusGuide || mongoose.model('CampusGuide', guideSchema);
module.exports.GUIDE_SECTIONS = GUIDE_SECTIONS;
module.exports.SAMPLE_GUIDES = SAMPLE_GUIDES;
