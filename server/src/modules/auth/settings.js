/**
 * Auth tunables. Read from the environment (root .env) with safe defaults. Core config is frozen, so these live here.
 *   AUTH_RATE_LIMIT_MAX       requests per window to the sensitive auth endpoints, per IP   (default 20)
 *   AUTH_RATE_LIMIT_WINDOW_MS window length                                                  (default 15 min)
 *   AUTH_LOCKOUT_ATTEMPTS     wrong passwords before an account is locked                    (default 5)
 *   AUTH_LOCKOUT_MINUTES      how long the lock lasts                                        (default 15)
 */
const num = (value, fallback) => (Number.isFinite(Number(value)) && Number(value) > 0 ? Number(value) : fallback);

module.exports = {
  rateLimit: {
    windowMs: num(process.env.AUTH_RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
    max: num(process.env.AUTH_RATE_LIMIT_MAX, 20),
  },
  lockoutAttempts: num(process.env.AUTH_LOCKOUT_ATTEMPTS, 5),
  lockoutMinutes: num(process.env.AUTH_LOCKOUT_MINUTES, 15),
};
