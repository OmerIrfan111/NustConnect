process.env.NODE_ENV = 'test';
delete process.env.VITE_DEV_FAKE_AUTH;

// Minimal in-memory User model: just what userModeration and the session check need.
global.__um = { users: new Map() };
jest.mock('./models/User', () => {
  const { users } = global.__um;
  const wrap = (d) => d && Object.assign(d, { save: async () => d, toPublic: () => ({ id: d._id, name: d.name }) });
  return { findById: async (id) => wrap(users.get(id)) };
});

const jwt = require('jsonwebtoken');
const request = require('supertest');
const config = require('../../core/config');
const { createApp } = require('../../core/app');
const { warn, suspend, unsuspend } = require('./userModeration');

const ID = 'a'.repeat(24);
const app = createApp();
const cookieFor = (id) => `nc_token=${jwt.sign({ sub: id }, config.jwtSecret)}`;

beforeEach(() => {
  global.__um.users.clear();
  global.__um.users.set(ID, { _id: ID, name: 'Ayesha Malik', email: 'a@students.nust.edu.pk', role: 'student', verified: true, suspended: false });
});

describe('userModeration contract (used by the admin module)', () => {
  test('is exported on the auth manifest, where the admin module looks for it', () => {
    const manifest = app.locals.modules.get('auth');
    expect(Object.keys(manifest.userModeration).sort()).toEqual(['suspend', 'unsuspend', 'warn']);
  });

  test('warn records the reason and keeps earlier warnings', async () => {
    expect(await warn(ID, 'Spamming rides')).toBe(true);
    expect(await warn(ID, 'Second warning')).toBe(true);
    const warnings = global.__um.users.get(ID).warnings;
    expect(warnings.map((w) => w.reason)).toEqual(['Spamming rides', 'Second warning']);
    expect(warnings[0].at).toBeInstanceOf(Date);
  });

  test('suspend signs the user out immediately, unsuspend lets them back in', async () => {
    expect((await request(app).get('/api/auth/me').set('Cookie', cookieFor(ID))).status).toBe(200);
    expect(await suspend(ID)).toBe(true);
    expect((await request(app).get('/api/auth/me').set('Cookie', cookieFor(ID))).status).toBe(401);
    expect(await unsuspend(ID)).toBe(true);
    expect((await request(app).get('/api/auth/me').set('Cookie', cookieFor(ID))).status).toBe(200);
  });

  test('unknown or malformed user ids resolve to false', async () => {
    for (const fn of [warn, suspend, unsuspend]) {
      expect(await fn('b'.repeat(24), 'x')).toBe(false);
      expect(await fn('not-an-id', 'x')).toBe(false);
    }
  });
});
