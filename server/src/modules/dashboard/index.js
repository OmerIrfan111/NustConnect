/** dashboard (A2) server manifest. Mounted at /api/dashboard. See docs/modules/dashboard/README.md. */
const express = require('express');
const { requireAuth } = require('../auth/session');
const notifications = require('./controllers/notificationController');
const hub = require('./controllers/hubController');

const router = express.Router();

router.get('/ping', (req, res) => res.json({ ok: true, slug: 'dashboard' }));

router.get('/notifications', requireAuth, notifications.list);
router.get('/notifications/unread-count', requireAuth, notifications.unreadCount);
router.post('/notifications/read-all', requireAuth, notifications.markAllRead); // before /:id/read
router.post('/notifications/:id/read', requireAuth, notifications.markRead);

router.get('/search', requireAuth, hub.searchAll);
router.get('/summary', requireAuth, hub.summarise);

module.exports = {
  slug: 'dashboard',
  router,
  // No searchProvider / summaryProvider: the dashboard has no content of its own to search.
};
