/** lostfound (C1) server manifest. Mounted at /api/lostfound. See docs/modules/lostfound/README.md. */
const express = require('express');
const { requireAuth } = require('../auth/session');
const items = require('./controllers/itemController');
const claims = require('./controllers/claimController');
const { searchProvider, summaryProvider, moderationHooks, deleteUserData } = require('./providers');

const router = express.Router();

router.get('/ping', (req, res) => res.json({ ok: true, slug: 'lostfound' }));

router.get('/items', requireAuth, items.listItems);
router.post('/items', requireAuth, items.handleUpload, items.createItem);
router.get('/items/:id', requireAuth, items.getItem);
router.patch('/items/:id', requireAuth, items.updateItem);
router.delete('/items/:id', requireAuth, items.deleteItem);
router.get('/items/:id/matches', requireAuth, items.getMatches);

router.post('/items/:id/claims', requireAuth, claims.createClaim);
router.patch('/claims/:claimId', requireAuth, claims.decideClaim);

module.exports = {
  slug: 'lostfound',
  router,
  searchProvider,
  summaryProvider,
  moderationHooks,
  deleteUserData,
};
