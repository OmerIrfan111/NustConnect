/**
 * Account moderation, exported on the auth manifest as `userModeration` for the admin module (A3).
 * Admin never imports this file: it reads `registry.get('auth').userModeration`.
 * Every function takes `(userId, note)` and resolves to true, or to false when the user does not exist.
 */
const User = require('./models/User');

const isObjectId = (id) => /^[a-f\d]{24}$/i.test(String(id));

async function load(userId) {
  if (!isObjectId(userId)) return null;
  return User.findById(userId);
}

/** Records a warning on the account (the reason is kept; shown to the user in a later phase). */
async function warn(userId, note) {
  const user = await load(userId);
  if (!user) return false;
  user.warnings = [...(user.warnings || []), { reason: String(note || '').slice(0, 500), at: new Date() }];
  await user.save();
  return true;
}

/** A suspended account is signed out immediately (the session check reads the flag on every request) and cannot log in. */
async function suspend(userId) {
  const user = await load(userId);
  if (!user) return false;
  user.suspended = true;
  await user.save();
  return true;
}

async function unsuspend(userId) {
  const user = await load(userId);
  if (!user) return false;
  user.suspended = false;
  await user.save();
  return true;
}

module.exports = { warn, suspend, unsuspend };
