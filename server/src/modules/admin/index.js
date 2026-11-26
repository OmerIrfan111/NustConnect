/** admin (A3) server manifest. Mounted at /api/admin. See docs/modules/admin/README.md. */
const express = require('express');
const { requireAuth, requireRole } = require('../auth/session');
const reports = require('./controllers/reportController');
const moderation = require('./controllers/moderationController');
const campaigns = require('./controllers/campaignController');
const contributions = require('./controllers/contributionController');
const categories = require('./controllers/categoryController');
const auditLog = require('./controllers/auditController');
const analyticsCtrl = require('./controllers/analyticsController');
const Report = require('./models/Report');

const router = express.Router();

router.get('/ping', (req, res) => res.json({ ok: true, slug: 'admin' }));

// Reporting contract (§6): behind the core <ReportButton />. Any signed-in user can report; staff read and act.
router.post('/reports', requireAuth, reports.create);
router.get('/reports', requireRole('moderator'), reports.list); // moderators and admins
router.post('/reports/:id/hide', requireRole('moderator'), moderation.hide);
router.post('/reports/:id/restore', requireRole('moderator'), moderation.restore);
router.post('/reports/:id/dismiss', requireRole('moderator'), moderation.dismiss);

// User moderation goes through the auth module's `userModeration` contract. Moderators warn, admins suspend.
router.post('/users/:id/warn', requireRole('moderator'), moderation.warn);
router.post('/users/:id/suspend', requireRole('admin'), moderation.suspend);
router.post('/users/:id/unsuspend', requireRole('admin'), moderation.unsuspend);

// Categories: everyone signed in reads (modules fall back to their defaults when empty), admins write.
router.get('/categories', requireAuth, categories.list);
router.post('/categories', requireRole('admin'), categories.create);
router.put('/categories/:id', requireRole('admin'), categories.update);
router.delete('/categories/:id', requireRole('admin'), categories.remove);

// Donations (FR-13): signed-in students read, admins write.
router.get('/campaigns', requireAuth, campaigns.list);
router.get('/campaigns/:id', requireAuth, campaigns.get);
router.post('/campaigns', requireRole('admin'), campaigns.create);
router.put('/campaigns/:id', requireRole('admin'), campaigns.update);
router.get('/campaigns/:id/contributions', requireRole('admin'), contributions.list);
router.post('/campaigns/:id/contributions', requireRole('admin'), contributions.add);
router.delete('/campaigns/:id/contributions/:contributionId', requireRole('admin'), contributions.remove);
router.post('/campaigns/:id/updates', requireRole('admin'), contributions.addUpdate);

router.get('/audit', requireRole('admin'), auditLog.list);
router.get('/analytics', requireRole('admin'), analyticsCtrl.analytics);

/**
 * "Delete my data" (called by the auth module through the registry). A report stays so the content can still be moderated, but
 * it no longer points at the person who filed it. The audit log is kept as-is: it records what staff did.
 */
async function deleteUserData(userId) {
  if (!userId) return; // never an unfiltered update
  await Report.updateMany({ reporterId: String(userId) }, { reporterId: 'deleted-user' });
}

module.exports = { slug: 'admin', router, deleteUserData };
