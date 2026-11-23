/** dashboard (A2) server manifest: BASE STUB. Owner replaces this; keep `slug` and `router`. See docs/CONTRACTS.md §1. */
const express = require('express');

const router = express.Router();
router.get('/ping', (req, res) => res.json({ ok: true, slug: 'dashboard' }));

module.exports = {
  slug: 'dashboard',
  router,
  // searchProvider: async (q, { limit }) => [],
  // summaryProvider: async (userId) => ({ stat: { label: '', value: 0 }, recent: [] }),
};
