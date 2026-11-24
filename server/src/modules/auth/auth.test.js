process.env.NODE_ENV = 'test';
delete process.env.VITE_DEV_FAKE_AUTH;

// ---- In-memory stand-ins for the Mongoose models and the mailer, so these tests need no database or SMTP ----
global.__auth = { users: new Map(), tokens: [], mails: [] };
let seq = 0;
const nextId = () => (++seq).toString(16).padStart(24, '0');

jest.mock('./models/User', () => {
  const { users } = global.__auth;
  const setPath = (obj, dotted, value) => {
    const parts = dotted.split('.');
    const last = parts.pop();
    const target = parts.reduce((o, k) => (o[k] = o[k] || {}), obj);
    target[last] = value;
  };
  const wrap = (doc) => {
    if (!doc) return null;
    doc.toPublic = () => ({
      id: doc._id, name: doc.name, email: doc.email, role: doc.role, verified: doc.verified,
      department: doc.department, batch: doc.batch, avatarUrl: doc.avatarUrl || '', phone: doc.phone || '',
      settings: { profileVisibility: 'verified', contactPreference: 'in-app', emailNotifications: true, ...(doc.settings || {}) },
    });
    doc.save = async () => doc;
    return doc;
  };
  const query = (doc) => {
    const q = Promise.resolve(wrap(doc));
    q.select = () => q;
    return q;
  };
  return {
    exists: async ({ email }) => ([...users.values()].some((u) => u.email === email) ? { _id: 1 } : null),
    create: async (data) => {
      const doc = { _id: nextId(), role: 'student', suspended: false, verified: false, passwordChangedAt: null, ...data };
      users.set(doc._id, doc);
      return wrap(doc);
    },
    findOne: ({ email }) => query([...users.values()].find((u) => u.email === email)),
    findById: (id) => query(users.get(id)),
    find: ({ name }) => {
      let list = [...users.values()].filter((u) => name.test(u.name));
      const c = { select: () => c, limit: (n) => ((list = list.slice(0, n)), c), lean: async () => list };
      return c;
    },
    findByIdAndUpdate: async (id, { $set }) => {
      const doc = users.get(id);
      Object.entries($set).forEach(([k, v]) => setPath(doc, k, v));
      return wrap(doc);
    },
  };
});

jest.mock('./models/Token', () => {
  const rows = global.__auth.tokens;
  return {
    deleteMany: async ({ userId, type }) => {
      for (let i = rows.length - 1; i >= 0; i--) if (rows[i].userId === userId && rows[i].type === type && !rows[i].usedAt) rows.splice(i, 1);
    },
    create: async (d) => rows.push({ usedAt: null, ...d }),
    findOneAndUpdate: async (q, patch) => {
      const r = rows.find((x) => x.tokenHash === q.tokenHash && x.type === q.type && x.usedAt === null && x.expiresAt > q.expiresAt.$gt);
      if (!r) return null;
      const before = { ...r };
      Object.assign(r, patch);
      return before;
    },
  };
});

jest.mock('./mailer', () => ({
  sendVerificationEmail: async (user, token) => global.__auth.mails.push({ kind: 'verify', to: user.email, token }),
  sendResetEmail: async (user, token) => global.__auth.mails.push({ kind: 'reset', to: user.email, token }),
}));

const fs = require('node:fs');
const path = require('node:path');
const jwt = require('jsonwebtoken');
const request = require('supertest');
const config = require('../../core/config');
const { createApp } = require('../../core/app');
const { validateRegister, isAllowedEmail, validateSettings } = require('./validation');

const app = createApp();
const valid = {
  name: 'Ahmed Khan',
  email: 'Ahmed@students.nust.edu.pk',
  department: 'SEECS',
  batch: '2023',
  password: 'Passw0rdOK',
  confirmPassword: 'Passw0rdOK',
  acceptTerms: true,
};
const mails = () => global.__auth.mails;
const lastMail = (kind) => [...mails()].reverse().find((m) => m.kind === kind);

/** Registers and returns an agent that holds the session cookie. Verified when `verify` is true. */
async function signUp({ verify = true } = {}) {
  const agent = request.agent(app);
  await agent.post('/api/auth/register').send(valid);
  if (verify) await request(app).post('/api/auth/verify-email').send({ token: lastMail('verify').token });
  return agent;
}

beforeEach(() => {
  global.__auth.users.clear();
  global.__auth.tokens.length = 0;
  global.__auth.mails.length = 0;
});

describe('validation', () => {
  test('NUST domain rule', () => {
    expect(isAllowedEmail('a@students.nust.edu.pk')).toBe(true);
    expect(isAllowedEmail('a@gmail.com')).toBe(false);
    expect(isAllowedEmail('a@evil-nust.edu.pk')).toBe(false);
    expect(isAllowedEmail('a@nust.edu.pk.evil.com')).toBe(false);
  });

  test('normalises the email and reports each bad field', () => {
    expect(validateRegister(valid).email).toBe('ahmed@students.nust.edu.pk');
    try {
      validateRegister({ ...valid, name: '', batch: 'abc', password: 'short', acceptTerms: false });
      throw new Error('should have thrown');
    } catch (e) {
      expect(e.status).toBe(400);
      expect(Object.keys(e.details).sort()).toEqual(['acceptTerms', 'batch', 'confirmPassword', 'name', 'password']);
    }
  });

  test('settings only accept known values', () => {
    expect(() => validateSettings({ profileVisibility: 'public' })).toThrow();
    expect(() => validateSettings({ phone: 'abc' })).toThrow();
    expect(validateSettings({ contactPreference: 'email' })).toEqual({ 'settings.contactPreference': 'email' });
  });
});

describe('register / login / me / logout', () => {
  test('register sets an httpOnly cookie and never returns the password', async () => {
    const res = await request(app).post('/api/auth/register').send(valid);
    expect(res.status).toBe(201);
    expect(res.body.user).toMatchObject({ name: 'Ahmed Khan', email: 'ahmed@students.nust.edu.pk', role: 'student', verified: false });
    expect(JSON.stringify(res.body)).not.toMatch(/password|hash/i);
    const cookie = res.headers['set-cookie'][0];
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=Lax/i);
    expect(cookie).not.toMatch(/Max-Age|Expires/i);
  });

  test('stored password is a bcrypt hash', async () => {
    await request(app).post('/api/auth/register').send(valid);
    const stored = [...global.__auth.users.values()][0];
    expect(stored.passwordHash).toMatch(/^\$2[aby]\$/);
    expect(stored.passwordHash).not.toContain(valid.password);
  });

  test('non-NUST email is rejected by the server', async () => {
    const res = await request(app).post('/api/auth/register').send({ ...valid, email: 'ahmed@gmail.com' });
    expect(res.status).toBe(400);
    expect(res.body.details.email).toMatch(/NUST/);
    expect(global.__auth.users.size).toBe(0);
  });

  test('duplicate email returns 409', async () => {
    await request(app).post('/api/auth/register').send(valid);
    expect((await request(app).post('/api/auth/register').send(valid)).status).toBe(409);
  });

  test('wrong password and unknown email give the same 401', async () => {
    await signUp();
    const wrong = await request(app).post('/api/auth/login').send({ email: valid.email, password: 'Nope12345' });
    const unknown = await request(app).post('/api/auth/login').send({ email: 'x@students.nust.edu.pk', password: 'Nope12345' });
    expect([wrong.status, unknown.status]).toEqual([401, 401]);
    expect(wrong.body.message).toBe(unknown.body.message);
  });

  test('login, /me keeps the session, logout ends it', async () => {
    await signUp({ verify: false });
    const agent = request.agent(app);
    expect((await agent.post('/api/auth/login').send({ email: valid.email, password: valid.password })).status).toBe(200);
    expect((await agent.get('/api/auth/me')).body.user.email).toBe('ahmed@students.nust.edu.pk');
    expect((await agent.post('/api/auth/logout')).status).toBe(204);
    expect((await agent.get('/api/auth/me')).status).toBe(401);
  });

  test('remember me issues a persistent cookie', async () => {
    await signUp();
    const res = await request(app).post('/api/auth/login').send({ email: valid.email, password: valid.password, remember: true });
    expect(res.headers['set-cookie'][0]).toMatch(/Max-Age=\d+|Expires=/i);
  });

  test('a forged token is 401', async () => {
    expect((await request(app).get('/api/auth/me').set('Cookie', 'nc_token=not.a.jwt')).status).toBe(401);
  });
});

describe('email verification (QA-2: unverified cannot reach protected pages)', () => {
  test('signup sends a link; unverified users are blocked from protected endpoints but can see /me', async () => {
    const agent = await signUp({ verify: false });
    expect(lastMail('verify').to).toBe('ahmed@students.nust.edu.pk');
    expect((await agent.get('/api/auth/me')).body.user.verified).toBe(false);

    const blocked = await agent.get('/api/auth/users/lookup?q=ah');
    expect(blocked.status).toBe(403);
    expect(blocked.body.details.code).toBe('unverified');
  });

  test('opening the link verifies the account and unlocks protected endpoints', async () => {
    const agent = await signUp({ verify: false });
    const res = await request(app).post('/api/auth/verify-email').send({ token: lastMail('verify').token });
    expect(res.body).toEqual({ verified: true });
    expect((await agent.get('/api/auth/me')).body.user.verified).toBe(true);
    const lookup = await agent.get('/api/auth/users/lookup?q=ah');
    expect(lookup.status).toBe(200);
    expect(Object.keys(lookup.body[0]).sort()).toEqual(['id', 'name', 'verified']); // never email or phone
  });

  test('a verification link works once, and bad or expired links fail', async () => {
    await signUp({ verify: false });
    const { token } = lastMail('verify');
    expect((await request(app).post('/api/auth/verify-email').send({ token })).status).toBe(200);
    expect((await request(app).post('/api/auth/verify-email').send({ token })).status).toBe(400);
    expect((await request(app).post('/api/auth/verify-email').send({ token: 'x'.repeat(64) })).status).toBe(400);
    expect((await request(app).post('/api/auth/verify-email').send({})).status).toBe(400);

    await request(app).post('/api/auth/register').send({ ...valid, email: 'b@students.nust.edu.pk' });
    const second = lastMail('verify').token;
    global.__auth.tokens.forEach((t) => (t.expiresAt = new Date(Date.now() - 1000)));
    expect((await request(app).post('/api/auth/verify-email').send({ token: second })).status).toBe(400);
  });

  test('resend issues a new link and the old one stops working', async () => {
    const agent = await signUp({ verify: false });
    const first = lastMail('verify').token;
    expect((await agent.post('/api/auth/resend-verification')).body.sent).toBe(true);
    expect(lastMail('verify').token).not.toBe(first);
    expect((await request(app).post('/api/auth/verify-email').send({ token: first })).status).toBe(400);
  });
});

describe('password reset (QA-2: token expires and cannot be reused)', () => {
  test('forgot-password answers identically for known and unknown emails, and only mails real accounts', async () => {
    await signUp();
    mails().length = 0;
    const known = await request(app).post('/api/auth/forgot-password').send({ email: valid.email });
    const unknown = await request(app).post('/api/auth/forgot-password').send({ email: 'nobody@students.nust.edu.pk' });
    expect(known.status).toBe(200);
    expect(known.body).toEqual(unknown.body);
    expect(mails().filter((m) => m.kind === 'reset')).toHaveLength(1);
  });

  test('reset changes the password; the old one stops working; the link cannot be reused', async () => {
    await signUp();
    await request(app).post('/api/auth/forgot-password').send({ email: valid.email });
    const { token } = lastMail('reset');
    const body = { token, password: 'NewPassw0rd1', confirmPassword: 'NewPassw0rd1' };

    expect((await request(app).post('/api/auth/reset-password').send(body)).status).toBe(200);
    expect((await request(app).post('/api/auth/login').send({ email: valid.email, password: valid.password })).status).toBe(401);
    expect((await request(app).post('/api/auth/login').send({ email: valid.email, password: 'NewPassw0rd1' })).status).toBe(200);
    expect((await request(app).post('/api/auth/reset-password').send(body)).status).toBe(400);
  });

  test('an expired reset link is rejected', async () => {
    await signUp();
    await request(app).post('/api/auth/forgot-password').send({ email: valid.email });
    global.__auth.tokens.forEach((t) => (t.expiresAt = new Date(Date.now() - 1000)));
    const res = await request(app).post('/api/auth/reset-password').send({ token: lastMail('reset').token, password: 'NewPassw0rd1' });
    expect(res.status).toBe(400);
  });

  test('a weak new password is rejected and the link stays usable', async () => {
    await signUp();
    await request(app).post('/api/auth/forgot-password').send({ email: valid.email });
    const { token } = lastMail('reset');
    expect((await request(app).post('/api/auth/reset-password').send({ token, password: 'short' })).status).toBe(400);
    expect((await request(app).post('/api/auth/reset-password').send({ token, password: 'NewPassw0rd1' })).status).toBe(200);
  });

  test('a session issued before the reset no longer works', async () => {
    await signUp();
    const userId = [...global.__auth.users.keys()][0];
    const oldSession = jwt.sign({ sub: userId, iat: Math.floor(Date.now() / 1000) - 100 }, config.jwtSecret);
    expect((await request(app).get('/api/auth/me').set('Cookie', `nc_token=${oldSession}`)).status).toBe(200);

    await request(app).post('/api/auth/forgot-password').send({ email: valid.email });
    await request(app).post('/api/auth/reset-password').send({ token: lastMail('reset').token, password: 'NewPassw0rd1' });
    expect((await request(app).get('/api/auth/me').set('Cookie', `nc_token=${oldSession}`)).status).toBe(401);
  });

  test('reset tokens and verify tokens are not interchangeable', async () => {
    await signUp({ verify: false });
    await request(app).post('/api/auth/forgot-password').send({ email: valid.email });
    const res = await request(app).post('/api/auth/verify-email').send({ token: lastMail('reset').token });
    expect(res.status).toBe(400);
  });

  test('raw tokens are never stored', async () => {
    await signUp({ verify: false });
    expect(JSON.stringify(global.__auth.tokens)).not.toContain(lastMail('verify').token);
  });
});

describe('profile and settings', () => {
  test('edit name, department and batch', async () => {
    const agent = await signUp();
    const res = await agent.patch('/api/auth/profile').send({ name: 'Ahmed R. Khan', department: 'SMME', batch: '2022' });
    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({ name: 'Ahmed R. Khan', department: 'SMME', batch: '2022' });
  });

  test('invalid profile values are 400, and role/verified cannot be changed through the profile', async () => {
    const agent = await signUp();
    expect((await agent.patch('/api/auth/profile').send({ department: 'Hackers' })).status).toBe(400);
    const res = await agent.patch('/api/auth/profile').send({ name: 'Ahmed Khan', role: 'admin', verified: false });
    expect(res.body.user.role).toBe('student');
    expect(res.body.user.verified).toBe(true);
  });

  test('privacy and contact settings, with phone required for a phone preference', async () => {
    const agent = await signUp();
    expect((await agent.patch('/api/auth/settings').send({ profileVisibility: 'private', contactPreference: 'email' })).body.user.settings)
      .toMatchObject({ profileVisibility: 'private', contactPreference: 'email' });

    const noPhone = await agent.patch('/api/auth/settings').send({ contactPreference: 'phone' });
    expect(noPhone.status).toBe(400);
    expect(noPhone.body.details.phone).toBeDefined();

    const ok = await agent.patch('/api/auth/settings').send({ contactPreference: 'phone', phone: '+92 300 1234567' });
    expect(ok.body.user.settings.contactPreference).toBe('phone');
    expect((await agent.patch('/api/auth/settings').send({ profileVisibility: 'everyone-and-more' })).status).toBe(400);
  });

  test('profile endpoints need a verified session', async () => {
    expect((await request(app).patch('/api/auth/profile').send({ name: 'X Y' })).status).toBe(401);
    const unverified = await signUp({ verify: false });
    expect((await unverified.patch('/api/auth/profile').send({ name: 'X Y' })).status).toBe(403);
  });

  describe('avatar upload', () => {
    const uploaded = [];
    afterAll(() => uploaded.forEach((f) => fs.rmSync(f, { force: true })));
    const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');

    test('accepts a small image and stores a random name', async () => {
      const agent = await signUp();
      const res = await agent.post('/api/auth/profile/avatar').attach('avatar', PNG, { filename: 'me.png', contentType: 'image/png' });
      expect(res.status).toBe(200);
      expect(res.body.user.avatarUrl).toMatch(/^\/uploads\/avatars\/[a-f0-9]{32}\.png$/);
      uploaded.push(path.join(config.uploadDir, 'avatars', path.basename(res.body.user.avatarUrl)));
    });

    test('rejects non-images and oversize files', async () => {
      const agent = await signUp();
      const text = await agent.post('/api/auth/profile/avatar').attach('avatar', Buffer.from('hello'), { filename: 'a.txt', contentType: 'text/plain' });
      expect(text.status).toBe(400);
      const big = await agent.post('/api/auth/profile/avatar').attach('avatar', Buffer.alloc(3 * 1024 * 1024), { filename: 'big.png', contentType: 'image/png' });
      expect(big.status).toBe(400);
      expect(big.body.message).toMatch(/2 MB/);
    });
  });
});
