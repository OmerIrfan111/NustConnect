const path = require('node:path');

const notifyModulePath = path.resolve(__dirname, '../dashboard/notify');

/**
 * Optional call to A2's notify() contract without violating the module import boundary.
 * Never throws so callers never fail when dashboard/DB is absent.
 */
async function notifyUser(userId, payload) {
  if (!userId || !payload?.title) return null;
  try {
    const mod = require(notifyModulePath);
    if (typeof mod?.notify === 'function') {
      return await mod.notify(String(userId), payload);
    }
  } catch {
    // Graceful fallback if dashboard module is unavailable
  }
  return null;
}

module.exports = { notifyUser };
