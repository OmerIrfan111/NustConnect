/** auth (A1) server manifest: BASE STUB. Owner replaces this; keep `slug` and `router`. See docs/CONTRACTS.md §1, §7. */
const express = require('express');
const { requireAuth } = require('./session');

const router = express.Router();

router.get('/ping', (req, res) => res.json({ ok: true, slug: 'auth' }));

// User lookup contract (§7). Stub: 3 sample users. NEVER return email or phone.
const SAMPLE_USERS = [
  { id: 'sample-user-1', name: 'Ayesha Malik', verified: true },
  { id: 'sample-user-2', name: 'Bilal Raza', verified: true },
  { id: 'sample-user-3', name: 'Hamza Sheikh', verified: false },
];

router.get('/users/lookup', requireAuth, (req, res) => {
  const q = String(req.query.q || '').trim().toLowerCase();
  res.json(SAMPLE_USERS.filter((u) => !q || u.name.toLowerCase().includes(q)));
});

module.exports = { slug: 'auth', router };
