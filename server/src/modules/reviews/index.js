/** reviews (B3) server manifest: BASE STUB. Owner replaces this file; keep `slug` and `router`. See docs/CONTRACTS.md §1. */
const express = require('express');

const router = express.Router();
router.get('/ping', (req, res) => res.json({ ok: true, slug: 'reviews' }));

module.exports = {
  slug: 'reviews',
  router,
  // searchProvider: async (q, { limit }) => [],
  // summaryProvider: async (userId) => ({ stat: { label: '', value: 0 }, recent: [] }),
  // moderationHooks: { hide: async (id) => {}, restore: async (id) => {} },
};
