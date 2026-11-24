/** auth (A1) server manifest. Mounted at /api/auth. See docs/modules/auth/README.md for the endpoint list. */
const express = require('express');
const { requireAuth, requireSession, requireRole } = require('./session');
const { makeLimiter } = require('./limits');
const ctrl = require('./controllers/authController');
const profile = require('./controllers/profileController');
const alumni = require('./controllers/alumniController');
const account = require('./controllers/accountController');
const userModeration = require('./userModeration');
const { contactForNotifications } = require('./contacts');

const router = express.Router();
const limiter = makeLimiter(); // per IP, on the endpoints an attacker would hammer

// Express 5 forwards rejected promises to the error handler, so handlers can be plain async functions.
router.get('/ping', (req, res) => res.json({ ok: true, slug: 'auth' }));

router.post('/register', limiter, ctrl.register);
router.post('/login', limiter, ctrl.login);
router.post('/logout', ctrl.logout);
router.post('/verify-email', limiter, ctrl.verifyEmail);
router.post('/forgot-password', limiter, ctrl.forgotPassword);
router.post('/reset-password', limiter, ctrl.resetPassword);

// requireSession lets unverified accounts through: they need these to finish verifying (or to leave).
router.get('/me', requireSession, ctrl.me);
router.post('/resend-verification', limiter, requireSession, ctrl.resendVerification);
router.delete('/me', requireSession, account.deleteMe); // "delete my data"

// Everything below needs a verified account.
router.get('/users/lookup', requireAuth, ctrl.lookup);
router.patch('/profile', requireAuth, profile.updateProfile);
router.patch('/settings', requireAuth, profile.updateSettings);
router.post('/profile/avatar', requireAuth, profile.uploadAvatar);

// Alumni verification: students ask, admins approve by hand.
router.post('/alumni-request', requireAuth, alumni.requestAlumni);
router.get('/alumni-requests', requireRole('admin'), alumni.listRequests);
router.post('/alumni-requests/:id/approve', requireRole('admin'), alumni.approve);
router.post('/alumni-requests/:id/reject', requireRole('admin'), alumni.reject);

// `userModeration` is the contract the admin module uses for warn / suspend / unsuspend (see docs/modules/admin/README.md).
// `contactForNotifications` is in-process only (email digest); no HTTP route exposes addresses.
module.exports = { slug: 'auth', router, userModeration, contactForNotifications };
