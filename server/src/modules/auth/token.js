/** JWT + httpOnly session cookie helpers. */
const jwt = require('jsonwebtoken');
const config = require('../../core/config');

const COOKIE_NAME = 'nc_token';
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
  res.cookie(COOKIE_NAME, signToken(userId, { remember }), {
    ...cookieOptions(),
    ...(remember ? { maxAge: 30 * DAY_MS } : {}),
  });
}

const clearSessionCookie = (res) => res.clearCookie(COOKIE_NAME, cookieOptions());

module.exports = { COOKIE_NAME, signToken, verifyToken, readToken, setSessionCookie, clearSessionCookie };
