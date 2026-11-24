/** auth (A1) server manifest. Mounted at /api/auth. See docs/modules/auth/README.md for the endpoint list. */
const express = require('express');
const { requireAuth } = require('./session');
const ctrl = require('./controllers/authController');

const router = express.Router();

// Express 5 forwards rejected promises to the error handler, so handlers can be plain async functions.
router.get('/ping', (req, res) => res.json({ ok: true, slug: 'auth' }));
router.post('/register', ctrl.register);
router.post('/login', ctrl.login);
router.post('/logout', ctrl.logout);
router.get('/me', requireAuth, ctrl.me);
router.get('/users/lookup', requireAuth, ctrl.lookup);

module.exports = { slug: 'auth', router };
