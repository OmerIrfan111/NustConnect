/** admin (A3) server manifest: BASE STUB. Owner replaces this; keep `slug` and `router`. See docs/CONTRACTS.md §1, §6. */
const express = require('express');
const { requireAuth } = require('../auth/session');

const router = express.Router();
router.get('/ping', (req, res) => res.json({ ok: true, slug: 'admin' }));

// Reporting contract (§6): behind the core <ReportButton targetType targetId />. Stub accepts and discards.
router.post('/reports', requireAuth, (req, res) => {
  const { targetType, targetId } = req.body || {};
  res.status(202).json({ accepted: true, targetType: targetType || null, targetId: targetId || null });
});

module.exports = { slug: 'admin', router };
