const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    // String, not ObjectId: the dev fake-auth user ("demo-ahmed-khan") has no database record.
    userId: { type: String, required: true, index: true },
    type: { type: String, default: 'info', maxlength: 40 },
    title: { type: String, required: true, maxlength: 140 },
    body: { type: String, default: '', maxlength: 500 },
    link: { type: String, default: '', maxlength: 300 }, // client route, e.g. '/rides/123'
    read: { type: Boolean, default: false },
    important: { type: Boolean, default: false }, // included in the email digest while still unread
    emailedAt: { type: Date, default: null }, // set once a digest email has listed it
  },
  { timestamps: true, collection: 'dashboard_notifications' },
);

notificationSchema.index({ userId: 1, read: 1, createdAt: -1 });

notificationSchema.methods.toPublic = function toPublic() {
  return {
    id: String(this._id),
    type: this.type,
    title: this.title,
    body: this.body,
    link: this.link,
    read: this.read,
    createdAt: this.createdAt,
  };
};

module.exports = mongoose.models.DashboardNotification || mongoose.model('DashboardNotification', notificationSchema);
