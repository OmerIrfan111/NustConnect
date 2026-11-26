const bcrypt = require('bcrypt');
const User = require('../models/User');
const Token = require('../models/Token');
const { HttpError } = require('../../../core/errors');
const { clearSessionCookie } = require('../token');

const isObjectId = (id) => /^[a-f\d]{24}$/i.test(String(id));

/**
 * DELETE /me { password }: "delete my data" (SRS privacy requirement).
 * 1. The password is checked again, so a stolen session alone cannot wipe an account.
 * 2. Every other module that stores data about people can export `deleteUserData(userId)` on its manifest. It is called here
 *    through the loader registry (auth never imports those modules). A module that fails is reported, not hidden.
 * 3. The account, its tokens and the session are removed.
 */
async function deleteMe(req, res) {
  if (!isObjectId(req.user.id)) throw new HttpError(400, 'The demo user has no account to delete');
  const password = typeof req.body?.password === 'string' ? req.body.password : '';
  if (!password) throw new HttpError(400, 'Enter your password to confirm', { password: 'Enter your password to confirm' });

  const user = await User.findById(req.user.id).select('+passwordHash');
  if (!user) throw new HttpError(401, 'Authentication required');
  if (!(await bcrypt.compare(password, user.passwordHash))) {
    throw new HttpError(403, 'Incorrect password', { password: 'Incorrect password' });
  }

  const cleaned = [];
  const failed = [];
  for (const m of (req.app.locals.modules || new Map()).values()) {
    if (typeof m.deleteUserData !== 'function') continue;
    try {
      await m.deleteUserData(String(user._id));
      cleaned.push(m.slug);
    } catch {
      failed.push(m.slug);
    }
  }

  await Token.deleteMany({ userId: String(user._id) });
  await User.findByIdAndDelete(user._id);
  clearSessionCookie(res);
  res.json({ deleted: true, cleaned, failed });
}

module.exports = { deleteMe };
