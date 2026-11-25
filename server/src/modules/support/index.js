/** support (C2) server manifest. Mounted at /api/support. See docs/modules/support/README.md. */
const express = require('express');
const { requireAuth, optionalAuth, requireRole } = require('../auth/session');
const complaints = require('./controllers/complaintController');
const helpbox = require('./controllers/helpBoxController');
const faq = require('./controllers/faqController');
const { searchProvider, summaryProvider, moderationHooks, deleteUserData } = require('./providers');

const router = express.Router();

router.get('/ping', (req, res) => res.json({ ok: true, slug: 'support' }));

// Facility Complaint Tracker (FR-12) — owner + staff only
router.get('/complaints', requireAuth, complaints.listComplaints);
router.post('/complaints', requireAuth, complaints.handleUpload, complaints.createComplaint);
router.get('/complaints/:id', requireAuth, complaints.getComplaint);
router.patch('/complaints/:id/status', requireAuth, complaints.updateStatus);

// Anonymous Help Box (FR-6, O4 Privacy) — ZERO user identity stored
router.post('/helpbox', helpbox.submitQuestion);
router.get('/helpbox/answered', helpbox.listAnswered);
router.get('/helpbox', requireRole('moderator'), helpbox.listQueue);
router.post('/helpbox/:id/answer', requireRole('moderator'), helpbox.answerQuestion);
router.post('/helpbox/:id/dismiss', requireRole('moderator'), helpbox.dismissQuestion);

// FAQ / Wiki (FR-6) — guest-accessible read, staff write
router.get('/faq', optionalAuth, faq.listFaq);
router.get('/faq/:id', optionalAuth, faq.getFaq);
router.post('/faq', requireRole('moderator'), faq.createFaq);
router.patch('/faq/:id', requireRole('moderator'), faq.updateFaq);
router.delete('/faq/:id', requireRole('moderator'), faq.deleteFaq);

module.exports = {
  slug: 'support',
  router,
  searchProvider,
  summaryProvider,
  moderationHooks,
  deleteUserData,
};
