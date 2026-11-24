/** dashboard (A2) server manifest. Mounted at /api/dashboard. See docs/modules/dashboard/README.md. */
const crypto = require('node:crypto');
const express = require('express');
const { requireAuth } = require('../auth/session');
const { HttpError } = require('../../core/errors');
const notifications = require('./controllers/notificationController');
const hub = require('./controllers/hubController');
const { runDigest } = require('./digest');

const router = express.Router();

router.get('/ping', (req, res) => res.json({ ok: true, slug: 'dashboard' }));

router.get('/notifications', requireAuth, notifications.list);
router.get('/notifications/unread-count', requireAuth, notifications.unreadCount);
router.post('/notifications/read-all', requireAuth, notifications.markAllRead); // before /:id/read
router.post('/notifications/:id/read', requireAuth, notifications.markRead);

router.get('/search', requireAuth, hub.searchAll);
router.get('/summary', requireAuth, hub.summarise);
router.get('/recommended', requireAuth, hub.recommend);

/**
 * POST /digest/run: machine-to-machine trigger for the email digest (cron / Task Scheduler).
 * Guarded by the DIGEST_KEY environment variable sent as the X-Digest-Key header. With no DIGEST_KEY the endpoint does not exist (404).
 */
router.post('/digest/run', async (req, res) => {
  const key = process.env.DIGEST_KEY;
  if (!key) throw new HttpError(404, 'Not found');
  const given = String(req.get('x-digest-key') || '');
  const ok = given.length === key.length && crypto.timingSafeEqual(Buffer.from(given), Buffer.from(key));
  if (!ok) throw new HttpError(401, 'Invalid digest key');
  res.json(await runDigest(req.app.locals.modules || new Map()));
});

module.exports = {
  slug: 'dashboard',
  router,
  // No searchProvider / summaryProvider: the dashboard has no content of its own to search.
};
