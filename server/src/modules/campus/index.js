/** campus (C3) server manifest. Mounted at /api/campus. See docs/modules/campus/README.md. */
const express = require('express');
const { requireAuth, requireRole } = require('../auth/session');
const pub = require('./controllers/publicController');
const bills = require('./controllers/billController');
const { searchProvider, summaryProvider, moderationHooks, deleteUserData } = require('./providers');

const router = express.Router();

router.get('/ping', (req, res) => res.json({ ok: true, slug: 'campus' }));

// Public, read-only: the map, its locations contract (docs/CONTRACTS.md §8) and the Freshie Guide (guests allowed)
router.get('/locations', pub.listLocations);
router.get('/guides', pub.listGuides);

// Bill Splitting (FR-14): signed in, participants only
router.get('/bills', requireAuth, bills.listBills);
router.post('/bills', requireAuth, bills.createBill);
router.post('/bills/reminders/run', requireRole('admin'), bills.runReminders);
router.get('/bills/:id', requireAuth, bills.getBill);
router.patch('/bills/:id', requireAuth, bills.updateBill);
router.delete('/bills/:id', requireAuth, bills.deleteBill);
router.post('/bills/:id/payments', requireAuth, bills.recordPayment);

module.exports = { slug: 'campus', router, searchProvider, summaryProvider, moderationHooks, deleteUserData };
