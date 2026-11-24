/**
 * Session contract: server side (docs/CONTRACTS.md §2). Owner: A1.
 * Exports (stable): requireAuth, optionalAuth, requireRole(...roles). Sets req.user = { id, name, role, verified }.
 *
 * The JWT lives in an httpOnly cookie. The user is re-read from the database on every request, so role changes and
 * suspensions take effect immediately. Dev: with VITE_DEV_FAKE_AUTH=true and no real session, requests are the demo
 * user "Ahmed Khan" (role from VITE_DEV_FAKE_ROLE), so other modules keep working without a database.
 */
const config = require('../../core/config');
const { HttpError } = require('../../core/errors');
const { COOKIE_NAME, verifyToken } = require('./token');

const DEMO_USER = Object.freeze({
  id: 'demo-ahmed-khan',
  name: 'Ahmed Khan',
  role: config.fakeRole,
  verified: true,
});

const toSessionUser = (u) => ({ id: String(u._id), name: u.name, role: u.role, verified: u.verified });

/** Resolves the user for a request: real session first, then the dev fake user, else null. */
async function resolveUser(req) {
  const id = verifyToken(req.cookies?.[COOKIE_NAME]);
  if (id) {
    // Required lazily so modules that only need session.js don't load Mongoose models at import time.
    const User = require('./models/User');
    const user = await User.findById(id);
    if (user && !user.suspended) return toSessionUser(user);
  }
  return config.fakeAuth ? { ...DEMO_USER } : null;
}

/** Sets req.user when a session exists, never fails with 401. */
const optionalAuth = async (req, res, next) => {
  try {
    req.user = await resolveUser(req);
    next();
  } catch (err) {
    next(err);
  }
};

/** 401 unless there is a session. */
const requireAuth = async (req, res, next) => {
  try {
    const user = await resolveUser(req);
    if (!user) return next(new HttpError(401, 'Authentication required'));
    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
};

/** 401 without a session, 403 unless the user has one of `roles`. Admins always pass. */
const requireRole =
  (...roles) =>
  (req, res, next) =>
    requireAuth(req, res, (err) => {
      if (err) return next(err);
      if (req.user.role === 'admin' || roles.includes(req.user.role)) return next();
      next(new HttpError(403, 'You do not have permission to do this'));
    });

module.exports = { requireAuth, optionalAuth, requireRole, DEMO_USER };
