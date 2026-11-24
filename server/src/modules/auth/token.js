/** JWT + httpOnly session cookie helpers. */
const jwt = require('jsonwebtoken');
const config = require('../../core/config');

const COOKIE_NAME = 'nc_token';
const DAY_MS = 24 * 60 * 60 * 1000;

const signToken = (userId, { remember = false } = {}) =>
  jwt.sign({ sub: String(userId) }, config.jwtSecret, { expiresIn: remember ? '30d' : config.jwtExpiresIn });

/** Returns the user id from a token, or null when it is missing, invalid or expired. */
function verifyToken(token) {
  if (!token) return null;
  try {
    return jwt.verify(token, config.jwtSecret).sub || null;
  } catch {
    return null;
  }
}

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

module.exports = { COOKIE_NAME, signToken, verifyToken, setSessionCookie, clearSessionCookie };
