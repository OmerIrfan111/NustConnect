const Notification = require('../models/Notification');
const { HttpError } = require('../../../core/errors');

/** GET /notifications?filter=all|unread&page=1&limit=20 (own notifications only) */
async function list(req, res) {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
  const query = { userId: req.user.id };
  if (req.query.filter === 'unread') query.read = false;

  const [items, total, unread] = await Promise.all([
    Notification.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Notification.countDocuments(query),
    Notification.countDocuments({ userId: req.user.id, read: false }),
  ]);
  res.json({ items: items.map((n) => n.toPublic()), total, unread, page, limit });
}

async function unreadCount(req, res) {
  res.json({ unread: await Notification.countDocuments({ userId: req.user.id, read: false }) });
}

/** POST /notifications/:id/read. 404 (not 403) for someone else's notification, so ids are not discoverable. */
async function markRead(req, res) {
  const n = await Notification.findOneAndUpdate(
    { _id: req.params.id, userId: req.user.id },
    { read: true },
    { returnDocument: 'after' },
  );
  if (!n) throw new HttpError(404, 'Notification not found');
  const unread = await Notification.countDocuments({ userId: req.user.id, read: false });
  res.json({ notification: n.toPublic(), unread });
}

async function markAllRead(req, res) {
  await Notification.updateMany({ userId: req.user.id, read: false }, { read: true });
  res.json({ unread: 0 });
}

module.exports = { list, unreadCount, markRead, markAllRead };
