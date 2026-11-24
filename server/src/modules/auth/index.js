/** auth (A1) server manifest. Mounted at /api/auth. See docs/modules/auth/README.md for the endpoint list. */
const express = require('express');
const { requireAuth, requireSession } = require('./session');
const ctrl = require('./controllers/authController');
const profile = require('./controllers/profileController');
const userModeration = require('./userModeration');

const router = express.Router();

// Express 5 forwards rejected promises to the error handler, so handlers can be plain async functions.
router.get('/ping', (req, res) => res.json({ ok: true, slug: 'auth' }));

router.post('/register', ctrl.register);
router.post('/login', ctrl.login);
router.post('/logout', ctrl.logout);
router.post('/verify-email', ctrl.verifyEmail);
router.post('/forgot-password', ctrl.forgotPassword);
router.post('/reset-password', ctrl.resetPassword);

// requireSession lets unverified accounts through: they need these to finish verifying.
router.get('/me', requireSession, ctrl.me);
router.post('/resend-verification', requireSession, ctrl.resendVerification);

// Everything below needs a verified account.
router.get('/users/lookup', requireAuth, ctrl.lookup);
router.patch('/profile', requireAuth, profile.updateProfile);
router.patch('/settings', requireAuth, profile.updateSettings);
router.post('/profile/avatar', requireAuth, profile.uploadAvatar);

// `userModeration` is the contract the admin module uses for warn / suspend / unsuspend (see docs/modules/admin/README.md).
module.exports = { slug: 'auth', router, userModeration };
