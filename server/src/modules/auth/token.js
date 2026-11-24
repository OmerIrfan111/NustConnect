/** JWT + httpOnly session cookie helpers, plus the CSRF double-submit cookie. */
const crypto = require('node:crypto');
const jwt = require('jsonwebtoken');
const config = require('../../core/config');

const COOKIE_NAME = 'nc_token';
// Axios reads the XSRF-TOKEN cookie and sends it back as the X-XSRF-TOKEN header on same-origin requests, with no client code.
const CSRF_COOKIE = 'XSRF-TOKEN';
const CSRF_HEADER = 'x-xsrf-token';
const DAY_MS = 24 * 60 * 60 * 1000;

const signToken = (userId, { remember = false } = {}) =>
  jwt.sign({ sub: String(userId) }, config.jwtSecret, { expiresIn: remember ? '30d' : config.jwtExpiresIn });

/** Returns `{ id, iat }` from a token, or null when it is missing, invalid or expired. */
function readToken(token) {
  if (!token) return null;
  try {
    const p = jwt.verify(token, config.jwtSecret);
    return p.sub ? { id: p.sub, iat: p.iat } : null;
  } catch {
    return null;
  }
}

/** Returns the user id from a token, or null when it is missing, invalid or expired. */
const verifyToken = (token) => readToken(token)?.id ?? null;

const cookieOptions = () => ({
  httpOnly: true,
  sameSite: 'lax',
  secure: config.isProduction,
  path: '/',
});

/** `remember` gives a 30-day persistent cookie; otherwise a session cookie that ends with the browser. */
function setSessionCookie(res, userId, { remember = false } = {}) {
  const persistence = remember ? { maxAge: 30 * DAY_MS } : {};
  res.cookie(COOKIE_NAME, signToken(userId, { remember }), { ...cookieOptions(), ...persistence });
  // Readable by the page on purpose (not httpOnly): the page echoes it in a header, a cross-site attacker cannot.
  res.cookie(CSRF_COOKIE, crypto.randomBytes(24).toString('hex'), { ...cookieOptions(), httpOnly: false, ...persistence });
}

function clearSessionCookie(res) {
  res.clearCookie(COOKIE_NAME, cookieOptions());
  res.clearCookie(CSRF_COOKIE, { ...cookieOptions(), httpOnly: false });
}

/** Safe methods never need a token. For the others the header must equal the cookie (constant-time comparison). */
function csrfOk(req) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return true;
  const cookie = req.cookies?.[CSRF_COOKIE];
  const header = req.get(CSRF_HEADER);
  if (typeof cookie !== 'string' || typeof header !== 'string' || !cookie || cookie.length !== header.length) return false;
  return crypto.timingSafeEqual(Buffer.from(cookie), Buffer.from(header));
}

module.exports = { COOKIE_NAME, CSRF_COOKIE, CSRF_HEADER, signToken, verifyToken, readToken, setSessionCookie, clearSessionCookie, csrfOk };
