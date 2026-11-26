process.env.NODE_ENV = 'test';

// Each appAs() builds a fresh app and loads every module present on the branch. When the other modules are merged in
// (auth with bcrypt/multer/nodemailer, and so on) that takes a few seconds, so allow for it.
jest.setTimeout(60000);

// ---- In-memory stand-ins for the Mongoose models. Rows live on `global` so they survive per-role module resets ----
global.__adminDb = {};
let seq = 0;
let clock = 1;
global.__nextId = () => (++seq).toString(16).padStart(24, '0');

global.__mk = (collection, publicOf, defaults = () => ({})) => {
  const rows = (global.__adminDb[collection] = global.__adminDb[collection] || []);
  const matches = (row, q = {}) =>
    Object.entries(q).every(([k, v]) => {
      if (v && typeof v === 'object' && '$ne' in v) return row[k] !== v.$ne;
      return String(row[k]) === String(v);
    });
  const wrap = (r) => {
    if (!r) return null;
    Object.defineProperty(r, 'toPublic', { value: () => publicOf(r), configurable: true, enumerable: false });
    Object.defineProperty(r, 'save', { value: async () => r, configurable: true, enumerable: false });
    return r;
  };
  const chain = (list) => {
    const c = {
      sort: (s) => {
        const [k, dir] = Object.entries(s || {})[0] || [];
        if (k) list = [...list].sort((a, b) => (a[k] > b[k] ? 1 : a[k] < b[k] ? -1 : 0) * dir);
        return c;
      },
      skip: (n) => ((list = list.slice(n)), c),
      limit: (n) => ((list = list.slice(0, n)), c),
      lean: async () => list,
      then: (res, rej) => Promise.resolve(list.map(wrap)).then(res, rej),
    };
    return c;
  };
  return {
    create: async (d) => {
      const r = { _id: global.__nextId(), createdAt: new Date(2026, 0, ++clock), ...defaults(), ...d };
      rows.push(r);
      return wrap(r);
    },
    insertMany: async (list) => list.map((d) => rows.push({ _id: global.__nextId(), createdAt: new Date(2026, 0, ++clock), ...d })),
    find: (q) => chain(rows.filter((r) => matches(r, q))),
    findOne: async (q) => wrap(rows.find((r) => matches(r, q))),
    findById: async (id) => wrap(rows.find((r) => r._id === id)),
    findByIdAndUpdate: async (id, patch) => {
      const r = rows.find((x) => x._id === id);
      if (!r) return null;
      Object.assign(r, patch);
      return wrap(r);
    },
    findByIdAndDelete: async (id) => {
      const i = rows.findIndex((x) => x._id === id);
      return i < 0 ? null : wrap(rows.splice(i, 1)[0]);
    },
    findOneAndDelete: async (q) => {
      const i = rows.findIndex((x) => matches(x, q));
      return i < 0 ? null : wrap(rows.splice(i, 1)[0]);
    },
    deleteMany: async (q) => rows.filter((r) => matches(r, q)).forEach((r) => rows.splice(rows.indexOf(r), 1)),
    countDocuments: async (q) => rows.filter((r) => matches(r, q)).length,
  };
};

jest.mock('./models/Report', () => ({
  REASONS: ['spam', 'abuse', 'inappropriate', 'misleading', 'other'],
  ...global.__mk('reports', (r) => ({
    id: r._id, targetType: r.targetType, targetId: r.targetId, reason: r.reason, details: r.details, reporterId: r.reporterId,
    status: r.status, action: r.action, note: r.note, handledAt: r.handledAt, createdAt: r.createdAt,
  }), () => ({ status: 'open', action: 'none', note: '', reason: 'other', details: '' })),
}));

jest.mock('./models/Campaign', () => {
  const { progressPercent } = require('./progress');
  return global.__mk('campaigns', (r) => ({
    id: r._id, title: r.title, description: r.description, goalAmount: r.goalAmount, raisedAmount: r.raisedAmount,
    progress: progressPercent(r.raisedAmount, r.goalAmount), status: r.status,
    updates: [...r.updates].sort((a, b) => b.at - a.at).map((u) => ({ text: u.text, at: u.at })),
  }), () => ({ status: 'active', raisedAmount: 0, updates: [] }));
});

jest.mock('./models/Contribution', () =>
  global.__mk('contributions', (r) => ({ id: r._id, campaignId: r.campaignId, donorName: r.anonymous ? '' : r.donorName, anonymous: Boolean(r.anonymous) || !r.donorName, amount: r.amount }), () => ({ anonymous: false, donorName: '' })),
);

jest.mock('./models/Category', () =>
  global.__mk('categories', (r) => ({ id: r._id, scope: r.scope, name: r.name, order: r.order, active: r.active }), () => ({ order: 100, active: true })),
);

jest.mock('./models/AuditEntry', () =>
  global.__mk('audit', (r) => ({
    id: r._id, actorId: r.actorId, actorName: r.actorName, actorRole: r.actorRole, action: r.action,
    targetType: r.targetType, targetId: r.targetId, reportId: r.reportId, note: r.note, at: r.createdAt,
  })),
);

const request = require('supertest');
const { progressPercent } = require('./progress');
const { validateCampaign, validateReport } = require('./validation');
const { moduleFor } = require('./moderation');

/** Fresh app with the demo user in the given role (or no session when role is null), plus extra fake modules. */
function appAs(role, modules = []) {
  jest.resetModules();
  if (role) {
    process.env.VITE_DEV_FAKE_AUTH = 'true';
    process.env.VITE_DEV_FAKE_ROLE = role;
  } else {
    delete process.env.VITE_DEV_FAKE_AUTH;
  }
  const app = require('../../core/app').createApp();
  modules.forEach((m) => app.locals.modules.set(m.slug, m));
  return app;
}

const db = (name) => global.__adminDb[name];
beforeEach(() => Object.keys(global.__adminDb).forEach((k) => (global.__adminDb[k].length = 0)));

/** A report row ready to be moderated. */
const seedReport = (over = {}) => {
  const row = { _id: global.__nextId(), targetType: 'ride', targetId: '42', reason: 'spam', details: '', reporterId: 'u9', status: 'open', action: 'none', note: '', createdAt: new Date(2026, 5, 1), ...over };
  db('reports') ? db('reports').push(row) : (global.__adminDb.reports = [row]);
  return row;
};
const ridesModule = () => {
  const hidden = new Set();
  return {
    hidden,
    mod: { slug: 'rideshare', moderationHooks: { hide: jest.fn(async (id) => hidden.add(id)), restore: jest.fn(async (id) => hidden.delete(id)) } },
  };
};

describe('progressPercent', () => {
  test.each([[0, 1000, 0], [500, 1000, 50], [1000, 1000, 100], [2500, 1000, 100], [10, 0, 0], [-5, 100, 0], [1, 3, 33]])(
    '%i of %i is %i %%', (raised, goal, pct) => expect(progressPercent(raised, goal)).toBe(pct),
  );
});

describe('validation', () => {
  test('report needs a target; unknown reasons fall back to other', () => {
    expect(validateReport({ targetType: 'Ride', targetId: '123', reason: 'weird' })).toMatchObject({ targetType: 'ride', targetId: '123', reason: 'other' });
    expect(() => validateReport({})).toThrow();
  });
  test('campaign needs a title and a positive goal; the raised amount can no longer be typed in', () => {
    expect(() => validateCampaign({ title: 'ab', goalAmount: 0 })).toThrow();
    expect(validateCampaign({ title: 'Flood relief', goalAmount: '5000', raisedAmount: 99999 })).not.toHaveProperty('raisedAmount');
  });
});

describe('module resolution for moderation hooks', () => {
  const reg = (...mods) => new Map(mods.map((m) => [m.slug, m]));
  test('explicit targetTypes win, then slug, then the alias table', () => {
    const explicit = { slug: 'marketplace', moderationHooks: { targetTypes: ['gadget'], hide() {}, restore() {} } };
    const rides = { slug: 'rideshare' };
    expect(moduleFor(reg(explicit, rides), 'gadget').slug).toBe('marketplace');
    expect(moduleFor(reg(explicit, rides), 'rideshare').slug).toBe('rideshare');
    expect(moduleFor(reg(explicit, rides), 'ride').slug).toBe('rideshare');
    expect(moduleFor(reg(explicit, rides), 'unknown-thing')).toBeNull();
  });
});

describe('access control (QA-1: non-admin gets 403 at the API)', () => {
  test('no session is 401', async () => {
    const app = appAs(null);
    expect((await request(app).get('/api/admin/reports')).status).toBe(401);
    expect((await request(app).post('/api/admin/campaigns').send({})).status).toBe(401);
  });

  test('a student cannot read the queue, act on reports, write campaigns or read the audit log', async () => {
    const r = seedReport();
    const app = appAs('student');
    for (const [method, url] of [
      ['get', '/api/admin/reports'], ['post', `/api/admin/reports/${r._id}/hide`], ['post', `/api/admin/reports/${r._id}/dismiss`],
      ['post', '/api/admin/campaigns'], ['put', '/api/admin/campaigns/1'], ['get', '/api/admin/audit'],
      ['post', '/api/admin/categories'], ['post', '/api/admin/users/u1/warn'], ['post', '/api/admin/users/u1/suspend'],
    ]) expect((await request(app)[method](url).send({})).status).toBe(403);
  });

  test('a moderator can act on reports and warn, but cannot suspend, write campaigns/categories or read the audit log', async () => {
    const app = appAs('moderator');
    expect((await request(app).get('/api/admin/reports')).status).toBe(200);
    for (const [method, url] of [
      ['post', '/api/admin/users/u1/suspend'], ['post', '/api/admin/campaigns'], ['post', '/api/admin/categories'],
      ['get', '/api/admin/audit'], ['post', '/api/admin/campaigns/1/contributions'],
    ]) expect((await request(app)[method](url).send({})).status).toBe(403);
  });
});

describe('reports', () => {
  test('a report from any user shows in the moderation queue; duplicates are not stored twice', async () => {
    const student = appAs('student');
    await request(student).post('/api/admin/reports').send({ targetType: 'ride', targetId: '42', reason: 'spam' });
    const again = await request(student).post('/api/admin/reports').send({ targetType: 'ride', targetId: '42' });
    expect(again.body.duplicate).toBe(true);

    const queue = await request(appAs('moderator')).get('/api/admin/reports');
    expect(queue.body.total).toBe(1);
    expect(queue.body.items[0]).toMatchObject({ targetType: 'ride', targetId: '42', reason: 'spam', status: 'open' });
    expect((await request(student).post('/api/admin/reports').send({})).status).toBe(400);
  });
});

describe('moderation actions (QA-2)', () => {
  test('hide calls the owning module, resolves the report and writes an audit entry with actor and time', async () => {
    const r = seedReport();
    const { mod, hidden } = ridesModule();
    const res = await request(appAs('moderator', [mod])).post(`/api/admin/reports/${r._id}/hide`).send({ note: 'Fake ride' });

    expect(res.status).toBe(200);
    expect(mod.moderationHooks.hide).toHaveBeenCalledWith('42');
    expect(hidden.has('42')).toBe(true);
    expect(res.body.report).toMatchObject({ status: 'resolved', action: 'hidden', note: 'Fake ride' });

    const entry = db('audit')[0];
    expect(entry).toMatchObject({ action: 'report.hide', actorId: 'demo-ahmed-khan', actorName: 'Ahmed Khan', actorRole: 'moderator', targetType: 'ride', targetId: '42', note: 'Fake ride' });
    expect(entry.createdAt).toBeInstanceOf(Date);
  });

  test('restore reverses a hide and is audited too', async () => {
    const r = seedReport();
    const { mod, hidden } = ridesModule();
    const app = appAs('moderator', [mod]);
    await request(app).post(`/api/admin/reports/${r._id}/hide`).send({});
    const res = await request(app).post(`/api/admin/reports/${r._id}/restore`).send({ note: 'Checked, fine' });

    expect(res.body.report.action).toBe('restored');
    expect(mod.moderationHooks.restore).toHaveBeenCalledWith('42');
    expect(hidden.has('42')).toBe(false);
    expect(db('audit').map((a) => a.action)).toEqual(['report.hide', 'report.restore']);
  });

  test('hiding twice, or restoring content that is not hidden, is a 409', async () => {
    const r = seedReport();
    const { mod } = ridesModule();
    const app = appAs('moderator', [mod]);
    expect((await request(app).post(`/api/admin/reports/${r._id}/restore`).send({})).status).toBe(409);
    await request(app).post(`/api/admin/reports/${r._id}/hide`).send({});
    expect((await request(app).post(`/api/admin/reports/${r._id}/hide`).send({})).status).toBe(409);
  });

  test('no module for the content type: 409, report untouched, nothing audited', async () => {
    const r = seedReport({ targetType: 'mystery' });
    const res = await request(appAs('moderator')).post(`/api/admin/reports/${r._id}/hide`).send({});
    expect(res.status).toBe(409);
    expect(db('reports')[0]).toMatchObject({ status: 'open', action: 'none' });
    expect(db('audit') || []).toHaveLength(0);
  });

  test('a module whose hook throws gives 502 and leaves no trace', async () => {
    const r = seedReport();
    const broken = { slug: 'rideshare', moderationHooks: { hide: async () => { throw new Error('db down'); } } };
    const res = await request(appAs('moderator', [broken])).post(`/api/admin/reports/${r._id}/hide`).send({});
    expect(res.status).toBe(502);
    expect(db('reports')[0].action).toBe('none');
    expect(db('audit') || []).toHaveLength(0);
  });

  test('dismiss closes an open report without touching content; a handled report cannot be dismissed again', async () => {
    const r = seedReport();
    const { mod } = ridesModule();
    const app = appAs('moderator', [mod]);
    const res = await request(app).post(`/api/admin/reports/${r._id}/dismiss`).send({ note: 'Not a violation' });
    expect(res.body.report).toMatchObject({ status: 'dismissed', action: 'none' });
    expect(mod.moderationHooks.hide).not.toHaveBeenCalled();
    expect((await request(app).post(`/api/admin/reports/${r._id}/dismiss`).send({})).status).toBe(409);
    expect(db('audit')[0].action).toBe('report.dismiss');
  });

  // Modules answer `false` (rather than throwing) when they have no such item, for example a report about content they do not own.
  test('a hook that resolves false means nothing was hidden: 404, report unchanged, nothing audited', async () => {
    const r = seedReport();
    const none = { slug: 'rideshare', moderationHooks: { hide: async () => false, restore: async () => false } };
    const res = await request(appAs('moderator', [none])).post(`/api/admin/reports/${r._id}/hide`).send({});
    expect(res.status).toBe(404);
    expect(db('reports')[0]).toMatchObject({ status: 'open', action: 'none' });
    expect(db('audit') || []).toHaveLength(0);
  });

  test('a restore hook that resolves false leaves the report hidden and unaudited', async () => {
    const r = seedReport({ status: 'resolved', action: 'hidden' });
    const none = { slug: 'rideshare', moderationHooks: { hide: async () => false, restore: async () => false } };
    const res = await request(appAs('moderator', [none])).post(`/api/admin/reports/${r._id}/restore`).send({});
    expect(res.status).toBe(404);
    expect(db('reports')[0].action).toBe('hidden');
    expect(db('audit') || []).toHaveLength(0);
  });

  test('unknown or malformed report ids are 404', async () => {
    const app = appAs('moderator');
    expect((await request(app).post('/api/admin/reports/not-an-id/hide').send({})).status).toBe(404);
    expect((await request(app).post(`/api/admin/reports/${'a'.repeat(24)}/hide`).send({})).status).toBe(404);
  });
});

describe('user moderation through the auth contract', () => {
  const authModule = (over = {}) => ({
    slug: 'auth',
    userModeration: { warn: jest.fn(async () => true), suspend: jest.fn(async () => true), unsuspend: jest.fn(async () => true), ...over },
  });

  test('a moderator warns with a reason; it is audited', async () => {
    const auth = authModule();
    const res = await request(appAs('moderator', [auth])).post('/api/admin/users/u7/warn').send({ reason: 'Spamming rides' });
    expect(res.status).toBe(200);
    expect(auth.userModeration.warn).toHaveBeenCalledWith('u7', 'Spamming rides');
    expect(db('audit')[0]).toMatchObject({ action: 'user.warn', targetType: 'user', targetId: 'u7', note: 'Spamming rides' });
  });

  test('warn needs a reason', async () => {
    expect((await request(appAs('moderator', [authModule()])).post('/api/admin/users/u7/warn').send({})).status).toBe(400);
  });

  test('an admin suspends and unsuspends; both are audited', async () => {
    const auth = authModule();
    const app = appAs('admin', [auth]);
    expect((await request(app).post('/api/admin/users/u7/suspend').send({ reason: 'Repeated abuse' })).status).toBe(200);
    expect((await request(app).post('/api/admin/users/u7/unsuspend').send({})).status).toBe(200);
    expect(db('audit').map((a) => a.action)).toEqual(['user.suspend', 'user.unsuspend']);
  });

  test('nobody can act on their own account', async () => {
    const res = await request(appAs('admin', [authModule()])).post('/api/admin/users/demo-ahmed-khan/suspend').send({ reason: 'Oops oops' });
    expect(res.status).toBe(400);
  });

  test('an unknown user is 404 and a missing auth contract is 409; neither is audited', async () => {
    const gone = authModule({ suspend: jest.fn(async () => false) });
    expect((await request(appAs('admin', [gone])).post('/api/admin/users/u7/suspend').send({ reason: 'Some reason' })).status).toBe(404);
    const noAuth = appAs('admin');
    noAuth.locals.modules.delete('auth'); // the contract is absent: even when the real auth module is merged in
    expect((await request(noAuth).post('/api/admin/users/u7/suspend').send({ reason: 'Some reason' })).status).toBe(409);
    expect(db('audit') || []).toHaveLength(0);
  });
});

describe('audit log', () => {
  test('admins read it newest first, with actor and time; entries can be filtered by action', async () => {
    const r1 = seedReport();
    const r2 = seedReport({ targetId: '43' });
    const { mod } = ridesModule();
    const mp = appAs('moderator', [mod]);
    await request(mp).post(`/api/admin/reports/${r1._id}/hide`).send({});
    await request(mp).post(`/api/admin/reports/${r2._id}/dismiss`).send({});

    const res = await request(appAs('admin')).get('/api/admin/audit');
    expect(res.status).toBe(200);
    expect(res.body.items.map((a) => a.action)).toEqual(['report.dismiss', 'report.hide']);
    expect(res.body.items[0]).toMatchObject({ actorName: 'Ahmed Khan', actorRole: 'moderator' });
    expect(res.body.items[0].at).toBeDefined();

    const filtered = await request(appAs('admin')).get('/api/admin/audit?action=report.hide');
    expect(filtered.body.items).toHaveLength(1);
  });

  test('there is no API to edit or delete audit entries', async () => {
    const app = appAs('admin');
    expect((await request(app).delete('/api/admin/audit/1')).status).toBe(404);
    expect((await request(app).put('/api/admin/audit/1').send({})).status).toBe(404);
  });
});

describe('categories', () => {
  test('admin manages categories; students and modules only see active ones, filtered by scope', async () => {
    const admin = appAs('admin');
    const a = await request(admin).post('/api/admin/categories').send({ scope: 'marketplace', name: 'Electronics', order: 1 });
    expect(a.status).toBe(201);
    await request(admin).post('/api/admin/categories').send({ scope: 'marketplace', name: 'Books', order: 2 });
    const hidden = await request(admin).post('/api/admin/categories').send({ scope: 'marketplace', name: 'Retired' });
    await request(admin).put(`/api/admin/categories/${hidden.body.category.id}`).send({ active: false });
    await request(admin).post('/api/admin/categories').send({ scope: 'reviews', name: 'Cafes' });

    const student = await request(appAs('student')).get('/api/admin/categories?scope=marketplace');
    expect(student.body.items.map((c) => c.name)).toEqual(['Electronics', 'Books']);
    expect((await request(admin).get('/api/admin/categories?scope=marketplace')).body.items).toHaveLength(3);

    expect((await request(appAs('student')).get('/api/admin/categories?scope=lostfound')).body.items).toEqual([]); // empty: module uses its defaults
    expect((await request(admin).delete(`/api/admin/categories/${a.body.category.id}`)).status).toBe(204);
    expect(db('audit').map((x) => x.action)).toEqual(['category.create', 'category.create', 'category.create', 'category.update', 'category.create', 'category.delete']);
  });

  test('validation', async () => {
    const res = await request(appAs('admin')).post('/api/admin/categories').send({ scope: '!', name: 'x' });
    expect(res.status).toBe(400);
    expect(Object.keys(res.body.details).sort()).toEqual(['name', 'scope']);
    expect((await request(appAs('admin')).delete('/api/admin/categories/not-an-id')).status).toBe(404);
  });
});

describe('donation campaigns', () => {
  const create = (admin, over = {}) => request(admin).post('/api/admin/campaigns').send({ title: 'Flood relief', goalAmount: 1000, ...over });

  test('admin creates; students list and read; creation is audited', async () => {
    const admin = appAs('admin');
    const created = await create(admin);
    expect(created.status).toBe(201);
    expect(created.body.campaign.progress).toBe(0);
    const id = created.body.campaign.id;

    const student = appAs('student');
    expect((await request(student).get('/api/admin/campaigns')).body.items).toHaveLength(1);
    expect((await request(student).get(`/api/admin/campaigns/${id}`)).body.campaign.title).toBe('Flood relief');
    expect(db('audit')[0].action).toBe('campaign.create');
  });

  test('the raised amount cannot be typed in: creates and edits ignore it', async () => {
    const admin = appAs('admin');
    const { body } = await create(admin, { raisedAmount: 999 });
    expect(body.campaign.raisedAmount).toBe(0);
    const edited = await request(admin).put(`/api/admin/campaigns/${body.campaign.id}`).send({ raisedAmount: 999, title: 'Renamed' });
    expect(edited.body.campaign).toMatchObject({ title: 'Renamed', raisedAmount: 0 });
  });

  test('contribution totals equal the sum of the records, at 0 %, 50 % and 100 % (QA-2)', async () => {
    const admin = appAs('admin');
    const { body } = await create(admin);
    const id = body.campaign.id;
    expect((await request(admin).get(`/api/admin/campaigns/${id}`)).body.campaign.progress).toBe(0);

    const a = await request(admin).post(`/api/admin/campaigns/${id}/contributions`).send({ amount: 200, donorName: 'Sana' });
    await request(admin).post(`/api/admin/campaigns/${id}/contributions`).send({ amount: 300, anonymous: true, donorName: 'Hidden Donor' });
    expect(a.body.total).toBe(200);
    let c = (await request(admin).get(`/api/admin/campaigns/${id}`)).body.campaign;
    expect([c.raisedAmount, c.progress]).toEqual([500, 50]);

    const last = await request(admin).post(`/api/admin/campaigns/${id}/contributions`).send({ amount: 500 });
    c = last.body.campaign;
    expect([c.raisedAmount, c.progress]).toEqual([1000, 100]);

    const list = await request(admin).get(`/api/admin/campaigns/${id}/contributions`);
    expect(list.body.items.reduce((s, x) => s + x.amount, 0)).toBe(list.body.total);
    expect(list.body.total).toBe(1000);

    // deleting a record lowers the total again
    const removed = await request(admin).delete(`/api/admin/campaigns/${id}/contributions/${a.body.contribution.id}`);
    expect(removed.body.total).toBe(800);
  });

  test('bad amounts and unknown campaigns are rejected; students cannot read or add records', async () => {
    const admin = appAs('admin');
    const { body } = await create(admin);
    const id = body.campaign.id;
    for (const amount of [0, -5, 'abc']) expect((await request(admin).post(`/api/admin/campaigns/${id}/contributions`).send({ amount })).status).toBe(400);
    expect((await request(admin).post(`/api/admin/campaigns/${'b'.repeat(24)}/contributions`).send({ amount: 10 })).status).toBe(404);
    const student = appAs('student');
    expect((await request(student).get(`/api/admin/campaigns/${id}/contributions`)).status).toBe(403);
    expect((await request(student).post(`/api/admin/campaigns/${id}/contributions`).send({ amount: 10 })).status).toBe(403);
  });

  test('the updates feed: admins post, students read newest first', async () => {
    const admin = appAs('admin');
    const { body } = await create(admin);
    const id = body.campaign.id;
    await request(admin).post(`/api/admin/campaigns/${id}/updates`).send({ text: 'First pledge received' });
    await request(admin).post(`/api/admin/campaigns/${id}/updates`).send({ text: 'Halfway there' });
    expect((await request(admin).post(`/api/admin/campaigns/${id}/updates`).send({ text: '.' })).status).toBe(400);

    const student = appAs('student');
    const feed = (await request(student).get(`/api/admin/campaigns/${id}`)).body.campaign.updates;
    expect(feed.map((u) => u.text)).toEqual(['Halfway there', 'First pledge received']);
    expect((await request(student).post(`/api/admin/campaigns/${id}/updates`).send({ text: 'Hacked update' })).status).toBe(403);
  });

  test('drafts are hidden from students (404) but visible to admins; bad input is 400; bad ids are 404', async () => {
    const admin = appAs('admin');
    const { body } = await create(admin, { title: 'Secret draft', status: 'draft' });
    const id = body.campaign.id;
    const student = appAs('student');
    expect((await request(student).get('/api/admin/campaigns')).body.items).toHaveLength(0);
    expect((await request(student).get(`/api/admin/campaigns/${id}`)).status).toBe(404);
    expect((await request(appAs('admin')).get(`/api/admin/campaigns/${id}`)).status).toBe(200);

    const bad = await request(appAs('admin')).post('/api/admin/campaigns').send({ title: 'x', goalAmount: -5 });
    expect(bad.status).toBe(400);
    expect(Object.keys(bad.body.details).sort()).toEqual(['goalAmount', 'title']);
    expect((await request(appAs('student')).get('/api/admin/campaigns/not-an-id')).status).toBe(404);
  });
});
