const bcrypt = require('bcrypt');
const User = require('../models/User');
const { HttpError } = require('../../../core/errors');
const { validateRegister, validateLogin } = require('../validation');
const { setSessionCookie, clearSessionCookie } = require('../token');

const BCRYPT_ROUNDS = 12;
// Compared against when the email is unknown, so response time does not reveal which emails are registered.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 4);

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
    verified: true, // Phase 1: domain rule only. Phase 2 replaces this with email verification.
  });

  setSessionCookie(res, user._id);
  res.status(201).json({ user: user.toPublic() });
}

async function login(req, res) {
  const { email, password, remember } = validateLogin(req.body);

  const user = await User.findOne({ email }).select('+passwordHash');
  const ok = await bcrypt.compare(password, user ? user.passwordHash : DUMMY_HASH);
  if (!user || !ok) throw new HttpError(401, 'Incorrect email or password');

  setSessionCookie(res, user._id, { remember });
  res.json({ user: user.toPublic() });
}

function logout(req, res) {
  clearSessionCookie(res);
  res.status(204).end();
}

async function me(req, res) {
  // Fake-auth demo user has no database record.
  if (!/^[a-f\d]{24}$/i.test(req.user.id)) {
    return res.json({
      user: { ...req.user, email: 'ahmed@students.nust.edu.pk', department: 'SEECS', batch: '2023' },
    });
  }
  const user = await User.findById(req.user.id);
  if (!user) throw new HttpError(401, 'Authentication required');
  res.json({ user: user.toPublic() });
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

module.exports = { register, login, logout, me, lookup };
