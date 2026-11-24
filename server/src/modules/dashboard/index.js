/** dashboard (A2) server manifest. Mounted at /api/dashboard. See docs/modules/dashboard/README.md. */
const express = require('express');
const { requireAuth } = require('../auth/session');
const ctrl = require('./controllers/notificationController');

const router = express.Router();

router.get('/ping', (req, res) => res.json({ ok: true, slug: 'dashboard' }));

router.get('/notifications', requireAuth, ctrl.list);
router.get('/notifications/unread-count', requireAuth, ctrl.unreadCount);
router.post('/notifications/read-all', requireAuth, ctrl.markAllRead); // before /:id/read
router.post('/notifications/:id/read', requireAuth, ctrl.markRead);

module.exports = {
  slug: 'dashboard',
  router,
  // searchProvider / summaryProvider: dashboard has no content of its own to search.
};
