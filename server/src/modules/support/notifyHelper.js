const path = require('node:path');

const notifyModulePath = path.resolve(__dirname, '../dashboard/notify');

async function notifyUser(userId, payload) {
  if (!userId || !payload?.title) return null;
  try {
    const mod = require(notifyModulePath);
    if (typeof mod?.notify === 'function') {
      return await mod.notify(String(userId), payload);
    }
  } catch {
    // Optional contract
  }
  return null;
}

module.exports = { notifyUser };
