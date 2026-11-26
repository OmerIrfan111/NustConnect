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
const { COOKIE_NAME, readToken, csrfOk } = require('./token');

const DEMO_USER = Object.freeze({
  id: 'demo-ahmed-khan',
  name: 'Ahmed Khan',
  role: config.fakeRole,
  verified: true,
});

const toSessionUser = (u) => ({ id: String(u._id), name: u.name, role: u.role, verified: u.verified });

/** Resolves the user for a request: real session first, then the dev fake user, else null. */
async function resolveUser(req) {
  const session = readToken(req.cookies?.[COOKIE_NAME]);
  if (session) {
    // Required lazily so modules that only need session.js don't load Mongoose models at import time.
    const User = require('./models/User');
    const user = await User.findById(session.id);
    // A password change ends every session that was issued before it.
    const changedAt = user?.passwordChangedAt ? Math.floor(new Date(user.passwordChangedAt).getTime() / 1000) : 0;
    if (user && !user.suspended && session.iat >= changedAt) {
      req.sessionSource = 'cookie';
      return toSessionUser(user);
    }
  }
  req.sessionSource = 'fake';
  return config.fakeAuth ? { ...DEMO_USER } : null;
}

/** CSRF: a state-changing request carried by the real session cookie must echo the XSRF-TOKEN cookie in a header. */
const csrfProblem = (req) =>
  req.sessionSource === 'cookie' && !csrfOk(req) ? new HttpError(403, 'Security check failed. Refresh the page and try again.', { code: 'csrf' }) : null;

/** Sets req.user when a session exists, never fails with 401. */
const optionalAuth = async (req, res, next) => {
  try {
    req.user = await resolveUser(req);
    next();
  } catch (err) {
    next(err);
  }
};

/** 401 unless there is a session. Unverified accounts get 403 `{ details: { code: 'unverified' } }`. */
const requireAuth = async (req, res, next) => {
  try {
    const user = await resolveUser(req);
    if (!user) return next(new HttpError(401, 'Authentication required'));
    const csrf = csrfProblem(req);
    if (csrf) return next(csrf);
    if (!user.verified) return next(new HttpError(403, 'Verify your email to continue', { code: 'unverified' }));
    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
};

/** Like requireAuth but lets unverified accounts through. Only for the auth endpoints that verified-gating would lock out. */
const requireSession = async (req, res, next) => {
  try {
    const user = await resolveUser(req);
    if (!user) return next(new HttpError(401, 'Authentication required'));
    const csrf = csrfProblem(req);
    if (csrf) return next(csrf);
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

module.exports = { requireAuth, optionalAuth, requireRole, requireSession, DEMO_USER };
