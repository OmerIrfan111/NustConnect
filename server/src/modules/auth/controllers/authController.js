const bcrypt = require('bcrypt');
const User = require('../models/User');
const { HttpError } = require('../../../core/errors');
const { validateRegister, validateLogin, validateForgot, validateReset } = require('../validation');
const { setSessionCookie, clearSessionCookie } = require('../token');
const { issueToken, consumeToken } = require('../tokens');
const { sendVerificationEmail, sendResetEmail } = require('../mailer');

const BCRYPT_ROUNDS = 12;
// Compared against when the email is unknown, so response time does not reveal which emails are registered.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 4);
const isObjectId = (id) => /^[a-f\d]{24}$/i.test(String(id));

async function register(req, res) {
  const data = validateRegister(req.body);

  if (await User.exists({ email: data.email })) {
    throw new HttpError(409, 'An account with this email already exists', { email: 'Email already registered' });
  }

  const user = await User.create({
    name: data.name,
    email: data.email,
    department: data.department,
    batch: data.batch,
    passwordHash: await bcrypt.hash(data.password, BCRYPT_ROUNDS),
    verified: false, // becomes true when the emailed link is opened
  });

  sendVerificationEmail(user, await issueToken(user._id, 'verify')); // not awaited: a mail outage must not fail signup

  setSessionCookie(res, user._id);
  res.status(201).json({ user: user.toPublic() });
}

async function login(req, res) {
  const { email, password, remember } = validateLogin(req.body);

  const user = await User.findOne({ email }).select('+passwordHash');
  const ok = await bcrypt.compare(password, user ? user.passwordHash : DUMMY_HASH);
  if (!user || !ok) throw new HttpError(401, 'Incorrect email or password');
  if (user.suspended) throw new HttpError(403, 'This account is suspended');

  setSessionCookie(res, user._id, { remember });
  res.json({ user: user.toPublic() });
}

function logout(req, res) {
  clearSessionCookie(res);
  res.status(204).end();
}

async function me(req, res) {
  // Fake-auth demo user has no database record.
  if (!isObjectId(req.user.id)) {
    return res.json({ user: { ...req.user, email: 'ahmed@students.nust.edu.pk', department: 'SEECS', batch: '2023' } });
  }
  const user = await User.findById(req.user.id);
  if (!user) throw new HttpError(401, 'Authentication required');
  res.json({ user: user.toPublic() });
}

/** POST /verify-email { token }: marks the account verified. Works without a session (the link opens in any browser). */
async function verifyEmail(req, res) {
  const userId = await consumeToken(req.body?.token, 'verify');
  if (!userId) throw new HttpError(400, 'This verification link is invalid or has expired');
  const user = await User.findById(userId);
  if (!user) throw new HttpError(400, 'This verification link is invalid or has expired');
  user.verified = true;
  await user.save();
  res.json({ verified: true });
}

/** POST /resend-verification (session): issues a fresh link. */
async function resendVerification(req, res) {
  if (!isObjectId(req.user.id)) return res.json({ sent: false });
  const user = await User.findById(req.user.id);
  if (!user) throw new HttpError(401, 'Authentication required');
  if (user.verified) return res.json({ sent: false, alreadyVerified: true });
  sendVerificationEmail(user, await issueToken(user._id, 'verify'));
  res.json({ sent: true });
}

/** POST /forgot-password { email }. Always answers the same way, so it cannot be used to find out who has an account. */
async function forgotPassword(req, res) {
  const { email } = validateForgot(req.body);
  const user = await User.findOne({ email });
  if (user && !user.suspended) sendResetEmail(user, await issueToken(user._id, 'reset'));
  res.json({ ok: true, message: 'If that email is registered, a reset link is on its way.' });
}

/** POST /reset-password { token, password, confirmPassword }. The token works once and for 1 hour. */
async function resetPassword(req, res) {
  const { token, password } = validateReset(req.body);
  const userId = await consumeToken(token, 'reset');
  if (!userId) throw new HttpError(400, 'This reset link is invalid, expired or already used');
  const user = await User.findById(userId);
  if (!user) throw new HttpError(400, 'This reset link is invalid, expired or already used');

  user.passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  user.passwordChangedAt = new Date(); // signs out every older session
  user.verified = true; // proving control of the inbox verifies the email too
  await user.save();
  clearSessionCookie(res);
  res.json({ ok: true });
}

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Lookup contract (§7): id, name, verified only. Never email or phone. */
async function lookup(req, res) {
  const q = String(req.query.q || '').trim().slice(0, 50);
  if (q.length < 2) return res.json([]);
  const users = await User.find({ name: new RegExp(escapeRegex(q), 'i') })
    .select('name verified')
    .limit(10)
    .lean();
  res.json(users.map((u) => ({ id: String(u._id), name: u.name, verified: u.verified })));
}

module.exports = { register, login, logout, me, verifyEmail, resendVerification, forgotPassword, resetPassword, lookup };
