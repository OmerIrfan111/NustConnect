/**
 * Server-only contract for the dashboard's email digest, exported on the auth manifest as `contactForNotifications`.
 * Email addresses are never returned by any HTTP endpoint (the user lookup contract forbids it). This function is only
 * reachable in-process through the loader registry, and only returns users who allow email notifications.
 *
 *   contactForNotifications(userIds) -> [{ id, name, email }]
 */
const User = require('./models/User');

const isObjectId = (id) => /^[a-f\d]{24}$/i.test(String(id));

async function contactForNotifications(userIds = []) {
  const ids = [...new Set(userIds.map(String))].filter(isObjectId).slice(0, 5000);
  if (ids.length === 0) return [];
  const users = await User.find({
    _id: { $in: ids },
    verified: true,
    suspended: { $ne: true },
    'settings.emailNotifications': { $ne: false }, // opted out when explicitly false; the default is on
  })
    .select('name email')
    .lean();
  return users.map((u) => ({ id: String(u._id), name: u.name, email: u.email }));
}

module.exports = { contactForNotifications };
