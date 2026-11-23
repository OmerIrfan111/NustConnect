/**
 * Session contract: server side (docs/CONTRACTS.md §2). BASE STUB.
 * Owner: A1 (module/auth) replaces the implementation. Exported names and shapes must stay the same:
 *   requireAuth, optionalAuth, requireRole(...roles)  (Express middleware)
 *   req.user = { id, name, role, verified }
 *
 * Stub behaviour: when VITE_DEV_FAKE_AUTH=true every request is the demo user "Ahmed Khan", with the role
 * from VITE_DEV_FAKE_ROLE. Otherwise there is no session, so requireAuth answers 401.
 */
const config = require('../../core/config');
const { HttpError } = require('../../core/errors');

const DEMO_USER = Object.freeze({
  id: 'demo-ahmed-khan',
  name: 'Ahmed Khan',
  role: config.fakeRole,
  verified: true,
});

function resolveUser() {
  return config.fakeAuth ? { ...DEMO_USER } : null;
}

/** Sets req.user when a session exists, never fails. */
const optionalAuth = (req, res, next) => {
  req.user = resolveUser();
  next();
};

/** 401 unless there is a session. */
const requireAuth = (req, res, next) => {
  const user = resolveUser();
  if (!user) return next(new HttpError(401, 'Authentication required'));
  req.user = user;
  next();
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
