process.env.NODE_ENV = 'test';
delete process.env.VITE_DEV_FAKE_AUTH;

// In-memory stand-in for the Mongoose model, so these tests need no database.
jest.mock('./models/User', () => {
  const db = new Map();
  let n = 0;
  const wrap = (doc) =>
    doc && {
      ...doc,
      toPublic: () => ({
        id: doc._id, name: doc.name, email: doc.email, role: doc.role,
        verified: doc.verified, department: doc.department, batch: doc.batch,
      }),
    };
  const query = (doc) => {
    const q = Promise.resolve(wrap(doc));
    q.select = () => q;
    return q;
  };
  return {
    __db: db,
    exists: async ({ email }) => ([...db.values()].some((u) => u.email === email) ? { _id: 1 } : null),
    create: async (data) => {
      const _id = (++n).toString(16).padStart(24, '0');
      const doc = { _id, role: 'student', suspended: false, ...data };
      db.set(_id, doc);
      return wrap(doc);
    },
    findOne: ({ email }) => query([...db.values()].find((u) => u.email === email)),
    findById: (id) => query(db.get(id)),
  };
});

const request = require('supertest');
const { createApp } = require('../../core/app');
const { validateRegister, isAllowedEmail } = require('./validation');
const User = require('./models/User');

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

beforeEach(() => User.__db.clear());

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
});

describe('register / login / me / logout', () => {
  test('register sets an httpOnly cookie and never returns the password', async () => {
    const res = await request(app).post('/api/auth/register').send(valid);
    expect(res.status).toBe(201);
    expect(res.body.user).toMatchObject({ name: 'Ahmed Khan', email: 'ahmed@students.nust.edu.pk', role: 'student' });
    expect(JSON.stringify(res.body)).not.toMatch(/password|hash/i);
    const cookie = res.headers['set-cookie'][0];
    expect(cookie).toMatch(/nc_token=/);
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=Lax/i);
    expect(cookie).not.toMatch(/Max-Age|Expires/i); // session cookie unless "remember me"
  });

  test('stored password is a bcrypt hash, not the plain text', async () => {
    await request(app).post('/api/auth/register').send(valid);
    const stored = [...User.__db.values()][0];
    expect(stored.passwordHash).toMatch(/^\$2[aby]\$/);
    expect(stored.passwordHash).not.toContain(valid.password);
  });

  test('non-NUST email is rejected by the server', async () => {
    const res = await request(app).post('/api/auth/register').send({ ...valid, email: 'ahmed@gmail.com' });
    expect(res.status).toBe(400);
    expect(res.body.details.email).toMatch(/NUST/);
    expect(User.__db.size).toBe(0);
  });

  test('duplicate email returns 409', async () => {
    await request(app).post('/api/auth/register').send(valid);
    const res = await request(app).post('/api/auth/register').send(valid);
    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/already exists/);
  });

  test('wrong password and unknown email give the same 401', async () => {
    await request(app).post('/api/auth/register').send(valid);
    const wrong = await request(app).post('/api/auth/login').send({ email: valid.email, password: 'Nope12345' });
    const unknown = await request(app).post('/api/auth/login').send({ email: 'x@students.nust.edu.pk', password: 'Nope12345' });
    expect(wrong.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(wrong.body.message).toBe(unknown.body.message);
  });

  test('login → /me keeps the session; logout ends it', async () => {
    await request(app).post('/api/auth/register').send(valid);
    const agent = request.agent(app);
    const login = await agent.post('/api/auth/login').send({ email: valid.email, password: valid.password });
    expect(login.status).toBe(200);

    const me = await agent.get('/api/auth/me');
    expect(me.status).toBe(200);
    expect(me.body.user.email).toBe('ahmed@students.nust.edu.pk');

    expect((await agent.post('/api/auth/logout')).status).toBe(204);
    expect((await agent.get('/api/auth/me')).status).toBe(401);
  });

  test('remember me issues a persistent cookie', async () => {
    await request(app).post('/api/auth/register').send(valid);
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: valid.email, password: valid.password, remember: true });
    expect(res.headers['set-cookie'][0]).toMatch(/Max-Age=\d+|Expires=/i);
  });

  test('/me without a session and with a forged token is 401', async () => {
    expect((await request(app).get('/api/auth/me')).status).toBe(401);
    const forged = await request(app).get('/api/auth/me').set('Cookie', 'nc_token=not.a.jwt');
    expect(forged.status).toBe(401);
  });
});
