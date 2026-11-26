/** Per-IP rate limiting for the sensitive auth endpoints (login, register, password reset, verification). */
const rateLimit = require('express-rate-limit');
const config = require('../../core/config');
const settings = require('./settings');

const MESSAGE = 'Too many attempts. Please wait a few minutes and try again.';

/**
 * `force` keeps the limiter on under NODE_ENV=test, so tests can exercise it. Otherwise it is skipped in tests only, so the
 * ordinary suites are not throttled by their own traffic.
 */
function makeLimiter({ windowMs = settings.rateLimit.windowMs, max = settings.rateLimit.max, force = false } = {}) {
  return rateLimit({
    windowMs,
    limit: max,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    skip: () => config.isTest && !force,
    message: { status: 429, message: MESSAGE, error: MESSAGE },
  });
}

module.exports = { makeLimiter, MESSAGE };
