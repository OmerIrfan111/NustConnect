process.env.NODE_ENV = 'test';
delete process.env.VITE_DEV_FAKE_AUTH;

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const request = require('supertest');
const { createApp } = require('./app');

const SLUGS = ['auth', 'dashboard', 'admin', 'rideshare', 'marketplace', 'reviews', 'lostfound', 'support', 'campus'];
const app = createApp();

describe('server core (QA gate 0)', () => {
  test('/api/health responds', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  test.each(SLUGS)('/api/%s/ping responds', async (slug) => {
    const res = await request(app).get(`/api/${slug}/ping`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true, slug });
  });

  test('loader mounted all nine modules without warnings', () => {
    expect([...app.locals.modules.keys()].sort()).toEqual([...SLUGS].sort());
    expect(app.locals.loaderWarnings).toEqual([]);
  });

  test('unknown API route returns a JSON 404', async () => {
    const res = await request(app).get('/api/nope');
    expect(res.status).toBe(404);
    expect(res.body.error.status).toBe(404);
  });

  test('campus locations stub returns 5 points', async () => {
    const res = await request(app).get('/api/campus/locations');
    expect(res.body).toHaveLength(5);
  });

  test('protected stubs return 401 without a session', async () => {
    expect((await request(app).get('/api/auth/users/lookup')).status).toBe(401);
    expect((await request(app).post('/api/admin/reports').send({})).status).toBe(401);
  });

  test('security headers are set', async () => {
    const res = await request(app).get('/api/health');
    expect(res.headers['x-powered-by']).toBeUndefined();
    expect(res.headers['x-content-type-options']).toBe('nosniff');
  });
});

describe('loader rules', () => {
  test('a module dropped into the folder is mounted with no shared edit, bad ones are warned about', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'nc-mods-'));
    const write = (folder, body) => {
      fs.mkdirSync(path.join(dir, folder));
      fs.writeFileSync(path.join(dir, folder, 'index.js'), body);
    };
    const good = `const r=require(${JSON.stringify(require.resolve('express'))}).Router();r.get('/ping',(q,s)=>s.json({ok:1}));module.exports={slug:'good',router:r};`;
    write('good', good);
    write('badslug', good.replace("'good'", "'other'"));
    write('norouter', "module.exports={slug:'norouter'};");

    const custom = createApp({ modulesDir: dir });
    expect([...custom.locals.modules.keys()]).toEqual(['good']);
    expect(custom.locals.loaderWarnings).toHaveLength(2);
  });
});

describe('session stub with fake auth', () => {
  test('demo user and role checks', async () => {
    jest.resetModules();
    process.env.VITE_DEV_FAKE_AUTH = 'true';
    process.env.VITE_DEV_FAKE_ROLE = 'student';
    const fresh = require('./app').createApp();

    const lookup = await request(fresh).get('/api/auth/users/lookup?q=ayesha');
    expect(lookup.status).toBe(200);
    expect(lookup.body).toEqual([{ id: 'sample-user-1', name: 'Ayesha Malik', verified: true }]);
    expect(JSON.stringify(lookup.body)).not.toMatch(/email|phone/i);

    const report = await request(fresh).post('/api/admin/reports').send({ targetType: 'ride', targetId: '1' });
    expect(report.status).toBe(202);

    const { requireRole } = require('../modules/auth/session');
    const run = (mw) => new Promise((resolve) => mw({}, {}, (err) => resolve(err)));
    expect((await run(requireRole('moderator'))).status).toBe(403);
    expect(await run(requireRole('student'))).toBeUndefined();
  });
});
