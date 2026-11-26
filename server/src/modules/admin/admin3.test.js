process.env.NODE_ENV = 'test';
jest.setTimeout(60000);
require('./testkit'); // installs global.__mk / __appAs / __clearDb (must run before the models are loaded)

jest.mock('./models/Report', () => ({
  REASONS: ['spam', 'abuse', 'inappropriate', 'misleading', 'other'],
  ...global.__mk('reports', (r) => ({ id: r._id, targetType: r.targetType, targetId: r.targetId, reason: r.reason, details: r.details, status: r.status, action: r.action, createdAt: r.createdAt }), () => ({ status: 'open', action: 'none', reason: 'other', details: '' })),
}));
jest.mock('./models/Campaign', () => global.__mk('campaigns', (r) => ({ id: r._id, title: r.title, goalAmount: r.goalAmount, raisedAmount: r.raisedAmount, status: r.status, updates: [] }), () => ({ status: 'active', raisedAmount: 0, updates: [] })));
jest.mock('./models/AuditEntry', () => global.__mk('audit', (r) => ({ id: r._id, action: r.action }), () => ({})));
jest.mock('./models/Contribution', () => global.__mk('contributions', (r) => ({ id: r._id, amount: r.amount }), () => ({})));
jest.mock('./models/Category', () => global.__mk('categories', (r) => ({ id: r._id, name: r.name }), () => ({})));

const request = require('supertest');

const appAs = (...a) => global.__appAs(...a);

/** An app whose module registry holds ONLY the given fake modules, so real modules merged into the repo cannot change the figures. */
const appWithOnly = (role, modules = []) => {
  const app = appAs(role);
  app.locals.modules.clear();
  modules.forEach((m) => app.locals.modules.set(m.slug, m));
  return app;
};
beforeEach(() => global.__clearDb());

const report = (over = {}) => {
  const row = { _id: global.__nextId(), targetType: 'ride', targetId: '1', reason: 'spam', details: '', reporterId: 'secret-reporter-1', status: 'open', action: 'none', createdAt: new Date(2026, 5, 1), ...over };
  (global.__adminDb.reports = global.__adminDb.reports || []).push(row);
  return row;
};

describe('moderation queue search, filters and pagination (QA-3)', () => {
  beforeEach(() => {
    report({ targetType: 'ride', targetId: '101', reason: 'spam', details: 'Fake driver' });
    report({ targetType: 'item', targetId: '202', reason: 'abuse', details: 'Rude seller' });
    report({ targetType: 'item', targetId: '303', reason: 'spam', details: 'Scam listing', status: 'resolved' });
    report({ targetType: 'review', targetId: 'r-9', reason: 'misleading', details: 'Fake review (1)' });
  });
  const queue = (qs) => request(appAs('moderator')).get(`/api/admin/reports?${qs}`);
  const ids = (res) => res.body.items.map((i) => i.targetId).sort();

  test('defaults to open reports', async () => expect(ids(await queue(''))).toEqual(['101', '202', 'r-9']));
  test('status filter and "all"', async () => {
    expect(ids(await queue('status=resolved'))).toEqual(['303']);
    expect((await queue('status=all')).body.total).toBe(4);
  });
  test('filters by reason and by content type, and they combine', async () => {
    expect(ids(await queue('reason=spam'))).toEqual(['101']);
    expect(ids(await queue('type=item'))).toEqual(['202']);
    expect(ids(await queue('status=all&type=item&reason=spam'))).toEqual(['303']);
  });
  test('searches the type, id and details text, case-insensitively', async () => {
    expect(ids(await queue('q=fake'))).toEqual(['101', 'r-9']);
    expect(ids(await queue('q=SELLER'))).toEqual(['202']);
    expect(ids(await queue('q=r-9'))).toEqual(['r-9']);
  });
  test('special characters in the search are treated as text, not as a pattern', async () => {
    expect(ids(await queue('q=' + encodeURIComponent('(1)')))).toEqual(['r-9']);
    const res = await queue('q=' + encodeURIComponent('.*'));
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(0);
    expect((await queue('q=' + encodeURIComponent('['))).status).toBe(200);
  });
  test('unknown reasons and malformed types are ignored, not errors', async () => {
    expect((await queue('reason=bogus')).body.total).toBe(3);
    expect((await queue('type=' + encodeURIComponent('a b$'))).body.total).toBe(3);
  });
  test('pagination returns the right slice and total', async () => {
    const p1 = await queue('status=all&limit=3&page=1');
    const p2 = await queue('status=all&limit=3&page=2');
    expect([p1.body.items.length, p2.body.items.length, p1.body.total]).toEqual([3, 1, 4]);
    expect(await queue('limit=999')).toHaveProperty('body.limit', 50); // capped
  });
});

describe('privacy: no admin screen leaks identity (QA-3)', () => {
  test('the queue never shows who reported', async () => {
    report();
    const res = await request(appAs('admin')).get('/api/admin/reports');
    expect(JSON.stringify(res.body)).not.toMatch(/reporter|secret-reporter/i);
  });

  test('a report about help-box content carries only type and id: staff are never shown the content or its author', async () => {
    report({ targetType: 'helpbox', targetId: 'q-77', details: 'Inappropriate question' });
    const res = await request(appAs('moderator')).get('/api/admin/reports?type=helpbox');
    expect(res.body.items).toHaveLength(1);
    expect(Object.keys(res.body.items[0]).sort()).toEqual(['action', 'createdAt', 'details', 'id', 'reason', 'status', 'targetId', 'targetType']);
  });

  test('analytics and audit responses contain no personal fields', async () => {
    report();
    const admin = appAs('admin');
    const a = JSON.stringify((await request(admin).get('/api/admin/analytics')).body);
    const b = JSON.stringify((await request(admin).get('/api/admin/audit')).body);
    expect(`${a}${b}`).not.toMatch(/email|phone|password|reporter/i);
  });
});

describe('analytics (QA-3: data from every module, no personal data)', () => {
  const provider = (slug, label, value, extra = {}) => ({ slug, summaryProvider: jest.fn(async () => ({ stat: { label, value }, recent: [{ text: 'Ayesha booked a ride', url: '/rides/1', at: new Date() }], ...extra })) });

  test('collects each provider platform-wide figure, drops recent activity, and counts platform data', async () => {
    report({ status: 'open' });
    report({ status: 'resolved' });
    report({ status: 'dismissed' });
    global.__adminDb.campaigns = [
      { _id: 'c1', status: 'active', raisedAmount: 500 },
      { _id: 'c2', status: 'closed', raisedAmount: 250 },
    ];
    const rides = provider('rideshare', 'Active Rides', 12);
    const market = provider('marketplace', 'Marketplace Listings', '34');
    const res = await request(appWithOnly('admin', [rides, market])).get('/api/admin/analytics');

    expect(res.status).toBe(200);
    expect(res.body.modules).toEqual([
      { module: 'marketplace', label: 'Marketplace Listings', value: 34 },
      { module: 'rideshare', label: 'Active Rides', value: 12 },
    ]);
    expect(rides.summaryProvider).toHaveBeenCalledWith(null, { scope: 'all' }); // no user, platform-wide
    expect(JSON.stringify(res.body)).not.toMatch(/Ayesha|recent|booked/);
    expect(res.body.platform).toMatchObject({ reportsOpen: 1, reportsResolved: 1, reportsDismissed: 1, campaigns: 2, campaignsActive: 1, pledgedTotal: 750 });
  });

  test('missing, failing, slow and malformed providers are skipped and listed', async () => {
    const mods = [
      provider('rideshare', 'Active Rides', 3),
      { slug: 'reviews', summaryProvider: async () => { throw new Error('db down'); } },
      { slug: 'support', summaryProvider: () => new Promise(() => {}) },
      { slug: 'campus', summaryProvider: async () => ({ stat: { label: 'Bills', value: 'many' } }) },
      { slug: 'lostfound', summaryProvider: async () => 'nonsense' },
      { slug: 'noprovider' },
    ];
    const app = appWithOnly('admin', mods);
    app.locals.providerTimeoutMs = 100;
    const t0 = Date.now();
    const res = await request(app).get('/api/admin/analytics');
    expect(res.status).toBe(200);
    expect(res.body.modules.map((m) => m.module)).toEqual(['rideshare']);
    expect(res.body.skipped).toEqual(['campus', 'lostfound', 'reviews', 'support']);
    expect(Date.now() - t0).toBeLessThan(2000);
  });

  test('works with no providers at all', async () => {
    const res = await request(appWithOnly('admin')).get('/api/admin/analytics');
    expect(res.body.modules).toEqual([]);
    expect(res.body.platform.reportsOpen).toBe(0);
  });
});

describe('permission matrix (QA-3: moderator vs admin, every admin route)', () => {
  const OID = 'd'.repeat(24);
  // [description, method, url, body, expected status for student, alumni, moderator, admin]
  const MATRIX = [
    ['read the queue', 'get', '/api/admin/reports', undefined, [403, 403, 200, 200]],
    ['hide content', 'post', `/api/admin/reports/${OID}/hide`, {}, [403, 403, 404, 404]],
    ['restore content', 'post', `/api/admin/reports/${OID}/restore`, {}, [403, 403, 404, 404]],
    ['dismiss a report', 'post', `/api/admin/reports/${OID}/dismiss`, {}, [403, 403, 404, 404]],
    ['warn a user', 'post', '/api/admin/users/u1/warn', {}, [403, 403, 400, 400]],
    ['suspend a user', 'post', '/api/admin/users/u1/suspend', {}, [403, 403, 403, 400]],
    ['unsuspend a user', 'post', '/api/admin/users/u1/unsuspend', {}, [403, 403, 403, 409]],
    ['list categories', 'get', '/api/admin/categories', undefined, [200, 200, 200, 200]],
    ['create a category', 'post', '/api/admin/categories', {}, [403, 403, 403, 400]],
    ['edit a category', 'put', '/api/admin/categories/not-an-id', {}, [403, 403, 403, 404]],
    ['delete a category', 'delete', '/api/admin/categories/not-an-id', undefined, [403, 403, 403, 404]],
    ['list campaigns', 'get', '/api/admin/campaigns', undefined, [200, 200, 200, 200]],
    ['create a campaign', 'post', '/api/admin/campaigns', {}, [403, 403, 403, 400]],
    ['edit a campaign', 'put', '/api/admin/campaigns/not-an-id', {}, [403, 403, 403, 404]],
    ['read pledges', 'get', `/api/admin/campaigns/${OID}/contributions`, undefined, [403, 403, 403, 404]],
    ['record a pledge', 'post', `/api/admin/campaigns/${OID}/contributions`, {}, [403, 403, 403, 400]],
    ['delete a pledge', 'delete', `/api/admin/campaigns/${OID}/contributions/${OID}`, undefined, [403, 403, 403, 404]],
    ['post a campaign update', 'post', `/api/admin/campaigns/${OID}/updates`, {}, [403, 403, 403, 400]],
    ['read the audit log', 'get', '/api/admin/audit', undefined, [403, 403, 403, 200]],
    ['read analytics', 'get', '/api/admin/analytics', undefined, [403, 403, 403, 200]],
  ];
  const ROLES = ['student', 'alumni', 'moderator', 'admin'];

  test.each(ROLES.map((r, i) => [r, i]))('%s gets exactly the allowed answer on every route', async (role, index) => {
    const app = appAs(role);
    app.locals.modules.delete('auth'); // no account-moderation contract: warn / suspend then fail on validation or with 409
    const failures = [];
    for (const [name, method, url, body, expected] of MATRIX) {
      const res = await (method === 'get' ? request(app).get(url) : request(app)[method](url).send(body || {}));
      if (res.status !== expected[index]) failures.push(`${name}: expected ${expected[index]}, got ${res.status}`);
    }
    expect(failures).toEqual([]);
  });

  test('anonymous visitors are 401 on every route', async () => {
    const app = appAs(null);
    const failures = [];
    for (const [name, method, url, body] of MATRIX) {
      const res = await (method === 'get' ? request(app).get(url) : request(app)[method](url).send(body || {}));
      if (res.status !== 401) failures.push(`${name}: got ${res.status}`);
    }
    expect(failures).toEqual([]);
  });
});

describe('real models never expose private fields', () => {
  test('toPublic of Report, AuditEntry and Contribution', () => {
    jest.isolateModules(() => {
      jest.unmock('./models/Report');
      jest.unmock('./models/Contribution');
      const Report = jest.requireActual('./models/Report');
      const Contribution = jest.requireActual('./models/Contribution');
      const r = new Report({ targetType: 'ride', targetId: '1', reporterId: 'secret-reporter-1', reason: 'spam' }).toPublic();
      expect(r).not.toHaveProperty('reporterId');
      expect(JSON.stringify(r)).not.toContain('secret-reporter-1');

      const anon = new Contribution({ campaignId: 'c', amount: 10, donorName: 'Sana', anonymous: true }).toPublic();
      expect(anon.donorName).toBe('');
      expect(anon.anonymous).toBe(true);
      expect(new Contribution({ campaignId: 'c', amount: 10, donorName: 'Sana' }).toPublic().donorName).toBe('Sana');
    });
  });
});
