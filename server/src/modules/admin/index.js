/** admin (A3) server manifest. Mounted at /api/admin. See docs/modules/admin/README.md. */
const express = require('express');
const { requireAuth, requireRole } = require('../auth/session');
const reports = require('./controllers/reportController');
const campaigns = require('./controllers/campaignController');

const router = express.Router();

router.get('/ping', (req, res) => res.json({ ok: true, slug: 'admin' }));

// Reporting contract (§6): behind the core <ReportButton />. Any signed-in user can report; staff read the queue.
router.post('/reports', requireAuth, reports.create);
router.get('/reports', requireRole('moderator'), reports.list); // moderators and admins

// Donations (FR-13): signed-in students read, admins write.
router.get('/campaigns', requireAuth, campaigns.list);
router.get('/campaigns/:id', requireAuth, campaigns.get);
router.post('/campaigns', requireRole('admin'), campaigns.create);
router.put('/campaigns/:id', requireRole('admin'), campaigns.update);

module.exports = { slug: 'admin', router };
