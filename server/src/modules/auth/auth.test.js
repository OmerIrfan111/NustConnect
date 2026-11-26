process.env.NODE_ENV = 'test';

// Real bcrypt (cost 12) runs on every register and login, and the lockout tests make many attempts.
jest.setTimeout(60000);
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
      alumniStatus: doc.alumniStatus || 'none',
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
  const matches = (u, f) => Object.entries(f).every(([k, v]) => (v instanceof RegExp ? v.test(u[k]) : u[k] === v));
  return {
    exists: async ({ email }) => ([...users.values()].some((u) => u.email === email) ? { _id: 1 } : null),
    create: async (data) => {
      const doc = {
        _id: nextId(), role: 'student', suspended: false, verified: false, passwordChangedAt: null,
        failedLogins: 0, lockedUntil: null, alumniStatus: 'none', ...data,
      };
      users.set(doc._id, doc);
      return wrap(doc);
    },
    findOne: ({ email }) => query([...users.values()].find((u) => u.email === email)),
    findById: (id) => query(users.get(id)),
    find: (filter) => {
      let list = [...users.values()].filter((u) => matches(u, filter));
      const c = { select: () => c, sort: () => c, limit: (n) => ((list = list.slice(0, n)), c), lean: async () => list,
        then: (res, rej) => Promise.resolve(list.map(wrap)).then(res, rej) };
      return c;
    },
    findByIdAndUpdate: async (id, patch) => {
      const doc = users.get(id);
      if (!doc) return null;
      Object.entries(patch.$set || {}).forEach(([k, v]) => setPath(doc, k, v));
      Object.entries(patch.$inc || {}).forEach(([k, v]) => (doc[k] = (doc[k] || 0) + v));
      return wrap(doc);
    },
    findByIdAndDelete: async (id) => {
      const doc = users.get(id);
      users.delete(id);
      return doc ? wrap(doc) : null;
    },
  };
});

jest.mock('./models/Token', () => {
  const rows = global.__auth.tokens;
  return {
    deleteMany: async ({ userId, type }) => {
      for (let i = rows.length - 1; i >= 0; i--) {
        if (rows[i].userId === userId && (type === undefined ? true : rows[i].type === type && !rows[i].usedAt)) rows.splice(i, 1);
      }
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
/** Adds the CSRF header an axios client would send, when the agent has a token. */
const csrf = (agent) => {
  const add = (req) => (agent.xsrf ? req.set('X-XSRF-TOKEN', agent.xsrf) : req);
  return { post: (u) => add(agent.post(u)), patch: (u) => add(agent.patch(u)), delete: (u) => add(agent.delete(u)) };
};
const mails = () => global.__auth.mails;
const lastMail = (kind) => [...mails()].reverse().find((m) => m.kind === kind);

/** Registers and returns an agent that holds the session cookie. Verified when `verify` is true. */
async function signUp({ verify = true } = {}) {
  const agent = request.agent(app);
  const reg = await csrf(agent).post('/api/auth/register').send(valid);
  agent.xsrf = (reg.headers['set-cookie'] || []).map((c) => /^XSRF-TOKEN=([^;]+)/.exec(c)?.[1]).find(Boolean);
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
    expect((await csrf(agent).post('/api/auth/resend-verification')).body.sent).toBe(true);
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
    const res = await csrf(agent).patch('/api/auth/profile').send({ name: 'Ahmed R. Khan', department: 'SMME', batch: '2022' });
    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({ name: 'Ahmed R. Khan', department: 'SMME', batch: '2022' });
  });

  test('invalid profile values are 400, and role/verified cannot be changed through the profile', async () => {
    const agent = await signUp();
    expect((await csrf(agent).patch('/api/auth/profile').send({ department: 'Hackers' })).status).toBe(400);
    const res = await csrf(agent).patch('/api/auth/profile').send({ name: 'Ahmed Khan', role: 'admin', verified: false });
    expect(res.body.user.role).toBe('student');
    expect(res.body.user.verified).toBe(true);
  });

  test('privacy and contact settings, with phone required for a phone preference', async () => {
    const agent = await signUp();
    expect((await csrf(agent).patch('/api/auth/settings').send({ profileVisibility: 'private', contactPreference: 'email' })).body.user.settings)
      .toMatchObject({ profileVisibility: 'private', contactPreference: 'email' });

    const noPhone = await csrf(agent).patch('/api/auth/settings').send({ contactPreference: 'phone' });
    expect(noPhone.status).toBe(400);
    expect(noPhone.body.details.phone).toBeDefined();

    const ok = await csrf(agent).patch('/api/auth/settings').send({ contactPreference: 'phone', phone: '+92 300 1234567' });
    expect(ok.body.user.settings.contactPreference).toBe('phone');
    expect((await csrf(agent).patch('/api/auth/settings').send({ profileVisibility: 'everyone-and-more' })).status).toBe(400);
  });

  test('profile endpoints need a verified session', async () => {
    expect((await request(app).patch('/api/auth/profile').send({ name: 'X Y' })).status).toBe(401);
    const unverified = await signUp({ verify: false });
    expect((await csrf(unverified).patch('/api/auth/profile').send({ name: 'X Y' })).status).toBe(403);
  });

  describe('avatar upload', () => {
    const uploaded = [];
    afterAll(() => uploaded.forEach((f) => fs.rmSync(f, { force: true })));
    const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');

    test('accepts a small image and stores a random name', async () => {
      const agent = await signUp();
      const res = await csrf(agent).post('/api/auth/profile/avatar').attach('avatar', PNG, { filename: 'me.png', contentType: 'image/png' });
      expect(res.status).toBe(200);
      expect(res.body.user.avatarUrl).toMatch(/^\/uploads\/avatars\/[a-f0-9]{32}\.png$/);
      uploaded.push(path.join(config.uploadDir, 'avatars', path.basename(res.body.user.avatarUrl)));
    });

    test('rejects non-images and oversize files', async () => {
      const agent = await signUp();
      const text = await csrf(agent).post('/api/auth/profile/avatar').attach('avatar', Buffer.from('hello'), { filename: 'a.txt', contentType: 'text/plain' });
      expect(text.status).toBe(400);
      const big = await csrf(agent).post('/api/auth/profile/avatar').attach('avatar', Buffer.alloc(3 * 1024 * 1024), { filename: 'big.png', contentType: 'image/png' });
      expect(big.status).toBe(400);
      expect(big.body.message).toMatch(/2 MB/);
    });
  });
});

// =====================================================================================================================
// Phase 3: roles, CSRF, lockout, rate limiting, alumni verification, delete my data, secrets in logs
// =====================================================================================================================
const bcrypt = require('bcrypt');
const express = require('express');
const UserModel = require('./models/User');
const settings = require('./settings');
const { makeLimiter } = require('./limits');
const { csrfOk } = require('./token');

/** A signed-in user with the given role, written straight into the store, with a matching CSRF cookie + header pair. */
async function asUser(role, over = {}) {
  const user = await UserModel.create({
    name: `Test ${role}`, email: `${role}@students.nust.edu.pk`, department: 'SEECS', batch: '2023',
    passwordHash: await bcrypt.hash('Passw0rdOK', 4), verified: true, role, ...over,
  });
  const token = jwt.sign({ sub: user._id }, config.jwtSecret);
  const x = `csrf-${role}-token-value`;
  const withCookies = (req) => req.set('Cookie', [`nc_token=${token}`, `XSRF-TOKEN=${x}`]);
  const unsafe = (req) => withCookies(req).set('X-XSRF-TOKEN', x);
  return {
    id: user._id,
    token,
    get: (u) => withCookies(request(app).get(u)),
    post: (u) => unsafe(request(app).post(u)),
    patch: (u) => unsafe(request(app).patch(u)),
    delete: (u) => unsafe(request(app).delete(u)),
    rawPost: (u) => withCookies(request(app).post(u)), // cookies but NO csrf header
    rawPatch: (u) => withCookies(request(app).patch(u)),
  };
}

describe('CSRF protection (QA-3)', () => {
  test('session cookie is httpOnly + SameSite; the CSRF cookie is readable by the page', async () => {
    const res = await request(app).post('/api/auth/register').send(valid);
    const cookies = res.headers['set-cookie'];
    const session = cookies.find((c) => c.startsWith('nc_token='));
    const xsrf = cookies.find((c) => c.startsWith('XSRF-TOKEN='));
    expect(session).toMatch(/HttpOnly/i);
    expect(session).toMatch(/SameSite=Lax/i);
    expect(xsrf).not.toMatch(/HttpOnly/i);
    expect(xsrf).toMatch(/SameSite=Lax/i);
  });

  test('a state-changing request with the session cookie but no token is refused', async () => {
    const u = await asUser('student');
    const post = await u.rawPost('/api/auth/resend-verification');
    expect(post.status).toBe(403);
    expect(post.body.details.code).toBe('csrf');
    expect((await u.rawPatch('/api/auth/profile').send({ name: 'Other Name' })).status).toBe(403);
  });

  test('a wrong token is refused and the right one works', async () => {
    const u = await asUser('student');
    const bad = await request(app)
      .patch('/api/auth/profile')
      .set('Cookie', [`nc_token=${u.token}`, 'XSRF-TOKEN=aaaa'])
      .set('X-XSRF-TOKEN', 'bbbb')
      .send({ name: 'New Name' });
    expect(bad.status).toBe(403);
    expect((await u.patch('/api/auth/profile').send({ name: 'New Name' })).status).toBe(200);
  });

  test('safe methods need no token, and csrfOk is length-safe', async () => {
    const u = await asUser('student');
    expect((await u.get('/api/auth/me')).status).toBe(200);
    expect(csrfOk({ method: 'GET', cookies: {}, get: () => undefined })).toBe(true);
    expect(csrfOk({ method: 'POST', cookies: { 'XSRF-TOKEN': 'abc' }, get: () => 'abcd' })).toBe(false);
    expect(csrfOk({ method: 'POST', cookies: {}, get: () => 'abc' })).toBe(false);
    expect(csrfOk({ method: 'DELETE', cookies: { 'XSRF-TOKEN': 'same' }, get: () => 'same' })).toBe(true);
  });

  test('an unauthenticated request is 401, not a CSRF error', async () => {
    expect((await request(app).patch('/api/auth/profile').send({})).status).toBe(401);
  });
});

describe('account lockout (QA-3)', () => {
  const attempt = (pw, email = valid.email) => request(app).post('/api/auth/login').send({ email, password: pw });

  test('locks after repeated wrong passwords, even for the right password; reports minutes left', async () => {
    await signUp();
    for (let i = 0; i < settings.lockoutAttempts; i++) expect((await attempt('Wrong12345')).status).toBe(401);
    const locked = await attempt(valid.password);
    expect(locked.status).toBe(429);
    expect(locked.body.details.code).toBe('locked');
    expect(locked.body.message).toMatch(/Try again in \d+ minute/);
  });

  test('the lock expires and a good login clears it', async () => {
    await signUp();
    for (let i = 0; i < settings.lockoutAttempts; i++) await attempt('Wrong12345');
    const doc = [...global.__auth.users.values()][0];
    expect(doc.lockedUntil).toBeInstanceOf(Date);
    doc.lockedUntil = new Date(Date.now() - 1000);
    expect((await attempt(valid.password)).status).toBe(200);
    expect(doc.failedLogins).toBe(0);
    expect(doc.lockedUntil).toBeNull();
  });

  test('a good login resets the failure counter', async () => {
    await signUp();
    for (let i = 0; i < settings.lockoutAttempts - 1; i++) await attempt('Wrong12345');
    expect((await attempt(valid.password)).status).toBe(200);
    expect([...global.__auth.users.values()][0].failedLogins).toBe(0);
    for (let i = 0; i < settings.lockoutAttempts - 1; i++) expect((await attempt('Wrong12345')).status).toBe(401);
    expect((await attempt(valid.password)).status).toBe(200); // still not locked
  });

  test('unknown emails are never locked and always get the plain 401', async () => {
    for (let i = 0; i < settings.lockoutAttempts + 2; i++) expect((await attempt('Wrong12345', 'ghost@students.nust.edu.pk')).status).toBe(401);
  });
});

describe('rate limiting (QA-3)', () => {
  test('the limiter answers 429 in the standard error shape once the budget is used', async () => {
    const tiny = express();
    tiny.use(makeLimiter({ max: 3, force: true }));
    tiny.get('/x', (req, res) => res.json({ ok: true }));
    for (let i = 0; i < 3; i++) expect((await request(tiny).get('/x')).status).toBe(200);
    const blocked = await request(tiny).get('/x');
    expect(blocked.status).toBe(429);
    expect(blocked.body.status).toBe(429);
    expect(typeof blocked.body.message).toBe('string');
    expect(blocked.body.error).toBe(blocked.body.message);
  });

  test('is wired onto login, register, reset and verification', () => {
    const stack = app.locals.modules.get('auth').router.stack.filter((l) => l.route);
    const limited = (path, method) => stack.find((l) => l.route.path === path && l.route.methods[method]).route.stack.length > 1;
    for (const path of ['/register', '/login', '/forgot-password', '/reset-password', '/verify-email']) expect(limited(path, 'post')).toBe(true);
  });
});

describe('alumni verification (QA-3)', () => {
  test('student requests, admin approves by hand, role becomes alumni', async () => {
    const student = await asUser('student');
    const admin = await asUser('admin');
    const year = new Date().getFullYear() - 1;

    expect((await student.post('/api/auth/alumni-request').send({ gradYear: 'soon' })).status).toBe(400);
    expect((await student.post('/api/auth/alumni-request').send({ gradYear: String(new Date().getFullYear() + 3) })).status).toBe(400);
    const made = await student.post('/api/auth/alumni-request').send({ gradYear: String(year), note: 'BSCS 2022' });
    expect(made.status).toBe(201);
    expect(made.body.user.alumniStatus).toBe('pending');
    expect((await student.post('/api/auth/alumni-request').send({ gradYear: String(year) })).status).toBe(409);

    const list = await admin.get('/api/auth/alumni-requests');
    expect(list.body.items).toHaveLength(1);
    expect(Object.keys(list.body.items[0]).sort()).toEqual(['batch', 'department', 'gradYear', 'id', 'name', 'note', 'requestedAt', 'status']);
    expect(JSON.stringify(list.body)).not.toMatch(/@|phone/i); // no email, no phone

    const approved = await admin.post(`/api/auth/alumni-requests/${student.id}/approve`).send({});
    expect(approved.body).toMatchObject({ status: 'approved', role: 'alumni' });
    expect((await student.get('/api/auth/me')).body.user.role).toBe('alumni');
    expect((await admin.post(`/api/auth/alumni-requests/${student.id}/approve`).send({})).status).toBe(404); // nothing pending any more
  });

  test('rejecting keeps the role; non-admins cannot review', async () => {
    const student = await asUser('student');
    const moderator = await asUser('moderator');
    const admin = await asUser('admin');
    await student.post('/api/auth/alumni-request').send({ gradYear: String(new Date().getFullYear() - 2) });
    expect((await moderator.post(`/api/auth/alumni-requests/${student.id}/approve`).send({})).status).toBe(403);
    expect((await student.post(`/api/auth/alumni-requests/${student.id}/approve`).send({})).status).toBe(403);
    const rejected = await admin.post(`/api/auth/alumni-requests/${student.id}/reject`).send({});
    expect(rejected.body).toMatchObject({ status: 'rejected', role: 'student' });
  });
});

describe('role matrix (QA-3: each role against each protected route)', () => {
  const year = String(new Date().getFullYear() - 1);
  // [description, method, url, body, expected status for student, alumni, moderator, admin]
  const MATRIX = [
    ['read own session', 'get', '/api/auth/me', undefined, [200, 200, 200, 200]],
    ['user lookup', 'get', '/api/auth/users/lookup?q=te', undefined, [200, 200, 200, 200]],
    ['edit profile', 'patch', '/api/auth/profile', { name: 'Same Name' }, [200, 200, 200, 200]],
    ['edit settings', 'patch', '/api/auth/settings', { profileVisibility: 'everyone' }, [200, 200, 200, 200]],
    ['request alumni status', 'post', '/api/auth/alumni-request', { gradYear: year }, [201, 409, 409, 409]],
    ['list alumni requests', 'get', '/api/auth/alumni-requests', undefined, [403, 403, 403, 200]],
    ['approve an alumni request', 'post', `/api/auth/alumni-requests/${'c'.repeat(24)}/approve`, {}, [403, 403, 403, 404]],
    ['reject an alumni request', 'post', `/api/auth/alumni-requests/${'c'.repeat(24)}/reject`, {}, [403, 403, 403, 404]],
  ];
  const ROLES = ['student', 'alumni', 'moderator', 'admin'];

  test.each(MATRIX)('%s', async (_name, method, url, body, expected) => {
    for (let i = 0; i < ROLES.length; i++) {
      global.__auth.users.clear();
      const u = await asUser(ROLES[i]);
      const res = await (method === 'get' ? u.get(url) : u[method](url).send(body));
      expect([ROLES[i], res.status]).toEqual([ROLES[i], expected[i]]);
    }
  });

  test.each(MATRIX)('%s: anonymous is 401', async (_name, method, url, body) => {
    const res = await (method === 'get' ? request(app).get(url) : request(app)[method](url).send(body || {}));
    expect(res.status).toBe(401);
  });

  test('registration can never grant a role', async () => {
    const res = await request(app).post('/api/auth/register').send({ ...valid, role: 'admin', verified: true });
    expect(res.body.user.role).toBe('student');
    expect(res.body.user.verified).toBe(false);
  });
});

describe('delete my data (QA-3)', () => {
  test('needs the password; a wrong one changes nothing', async () => {
    const u = await asUser('student');
    expect((await u.delete('/api/auth/me').send({})).status).toBe(400);
    expect((await u.delete('/api/auth/me').send({ password: 'Nope12345' })).status).toBe(403);
    expect(global.__auth.users.size).toBe(1);
  });

  test('removes the account, its tokens and the session, and asks every module to delete its data', async () => {
    const u = await asUser('student');
    global.__auth.tokens.push({ userId: u.id, type: 'verify', tokenHash: 'h1', usedAt: null, expiresAt: new Date(Date.now() + 1000) });
    const ok = { slug: 'rideshare', deleteUserData: jest.fn(async () => {}) };
    const broken = { slug: 'reviews', deleteUserData: async () => { throw new Error('db down'); } };
    // Only the fake modules take part: real modules merged into the repo have their own deleteUserData.
    const real = new Map(app.locals.modules);
    app.locals.modules.clear();
    app.locals.modules.set('rideshare', ok);
    app.locals.modules.set('reviews', broken);

    const res = await u.delete('/api/auth/me').send({ password: 'Passw0rdOK' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ deleted: true, cleaned: ['rideshare'], failed: ['reviews'] }); // a failing module is reported, not hidden
    expect(ok.deleteUserData).toHaveBeenCalledWith(u.id);
    expect(global.__auth.users.size).toBe(0);
    expect(global.__auth.tokens.filter((t) => t.userId === u.id)).toHaveLength(0);
    expect(res.headers['set-cookie'].join(';')).toMatch(/nc_token=;/);
    expect((await u.get('/api/auth/me')).status).toBe(401);
    app.locals.modules.clear();
    real.forEach((m, slug) => app.locals.modules.set(slug, m));
  });

  test('an unverified account can delete itself too', async () => {
    const u = await asUser('student', { verified: false });
    expect((await u.delete('/api/auth/me').send({ password: 'Passw0rdOK' })).status).toBe(200);
  });
});

describe('secrets never leak (QA-3)', () => {
  test('passwords and reset tokens do not appear in logs or responses', async () => {
    const spies = ['log', 'info', 'warn', 'error', 'debug'].map((k) => jest.spyOn(console, k).mockImplementation(() => {}));
    const bodies = [];
    const keep = async (p) => bodies.push(JSON.stringify((await p).body));

    await keep(request(app).post('/api/auth/register').send(valid));
    await keep(request(app).post('/api/auth/login').send({ email: valid.email, password: 'WrongPass99' }));
    await keep(request(app).post('/api/auth/login').send({ email: valid.email, password: valid.password }));
    await keep(request(app).post('/api/auth/forgot-password').send({ email: valid.email }));
    const token = lastMail('reset').token;
    await keep(request(app).post('/api/auth/reset-password').send({ token, password: 'BrandNew123', confirmPassword: 'BrandNew123' }));
    await keep(request(app).post('/api/auth/reset-password').send({ token, password: 'BrandNew123' })); // reused: an error body

    const logged = spies.flatMap((s) => s.mock.calls).map((c) => c.map(String).join(' ')).join('\n');
    spies.forEach((s) => s.mockRestore());
    const everything = `${logged}\n${bodies.join('\n')}`;
    for (const secret of [valid.password, 'WrongPass99', 'BrandNew123', token]) expect(everything).not.toContain(secret);
    expect(everything).not.toMatch(/passwordHash|\$2[aby]\$/);
  });
});
