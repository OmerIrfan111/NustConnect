process.env.NODE_ENV = 'test';

// In-memory stand-ins for the Mongoose models. Rows live on `global` so they survive the per-role module resets below.
global.__adminDb = { reports: [], campaigns: [] };
let seq = 0;
const nextId = () => (++seq).toString(16).padStart(24, '0');
const matches = (row, q) =>
  Object.entries(q).every(([k, v]) => {
    if (v && typeof v === 'object' && '$ne' in v) return row[k] !== v.$ne;
    return String(row[k]) === String(v);
  });
const chain = (list) => {
  const c = {
    sort: () => c,
    skip: (k) => ((list = list.slice(k)), c),
    limit: (k) => ((list = list.slice(0, k)), c),
    then: (res, rej) => Promise.resolve(list).then(res, rej),
  };
  return c;
};

jest.mock('./models/Report', () => {
  const rows = global.__adminDb.reports;
  const wrap = (r) => ({ ...r, toPublic: () => ({ id: r._id, ...r }) });
  return {
    REASONS: ['spam', 'abuse', 'inappropriate', 'misleading', 'other'],
    findOne: async (q) => {
      const r = rows.find((x) => matches(x, q));
      return r ? wrap(r) : null;
    },
    create: async (d) => {
      const r = { _id: nextId(), status: 'open', createdAt: new Date(), ...d };
      rows.push(r);
      return wrap(r);
    },
    find: (q) => chain(rows.filter((r) => matches(r, q)).map(wrap)),
    countDocuments: async (q) => rows.filter((r) => matches(r, q)).length,
  };
});

jest.mock('./models/Campaign', () => {
  const { progressPercent } = require('./progress');
  const rows = global.__adminDb.campaigns;
  const wrap = (r) => ({ ...r, toPublic: () => ({ id: r._id, ...r, progress: progressPercent(r.raisedAmount, r.goalAmount) }) });
  return {
    find: (q) => chain(rows.filter((r) => matches(r, q)).map(wrap)),
    findById: async (id) => {
      const r = rows.find((x) => x._id === id);
      return r ? wrap(r) : null;
    },
    create: async (d) => {
      const r = { _id: nextId(), status: 'active', raisedAmount: 0, ...d };
      rows.push(r);
      return wrap(r);
    },
    findByIdAndUpdate: async (id, patch) => {
      const r = rows.find((x) => x._id === id);
      if (!r) return null;
      Object.assign(r, patch);
      return wrap(r);
    },
  };
});

const request = require('supertest');
const { progressPercent } = require('./progress');
const { validateCampaign, validateReport } = require('./validation');

/** Fresh app whose session stub is the demo user with the given role (or no session when role is null). */
function appAs(role) {
  jest.resetModules();
  if (role) {
    process.env.VITE_DEV_FAKE_AUTH = 'true';
    process.env.VITE_DEV_FAKE_ROLE = role;
  } else {
    delete process.env.VITE_DEV_FAKE_AUTH;
  }
  return require('../../core/app').createApp();
}

beforeEach(() => {
  global.__adminDb.reports.length = 0;
  global.__adminDb.campaigns.length = 0;
});

describe('progressPercent', () => {
  test('0 %, 50 % and 100 %', () => {
    expect(progressPercent(0, 1000)).toBe(0);
    expect(progressPercent(500, 1000)).toBe(50);
    expect(progressPercent(1000, 1000)).toBe(100);
  });
  test('clamps and never returns NaN or Infinity', () => {
    expect(progressPercent(5000, 1000)).toBe(100);
    expect(progressPercent(10, 0)).toBe(0);
    expect(progressPercent(-5, 100)).toBe(0);
    expect(progressPercent(undefined, 100)).toBe(0);
    expect(progressPercent(1, 3)).toBe(33);
  });
});

describe('validation', () => {
  test('report needs a target; unknown reasons fall back to other', () => {
    expect(validateReport({ targetType: 'Ride', targetId: '123', reason: 'weird' })).toMatchObject({
      targetType: 'ride', targetId: '123', reason: 'other',
    });
    expect(() => validateReport({})).toThrow();
  });
  test('campaign needs a title and a positive goal', () => {
    expect(() => validateCampaign({ title: 'ab', goalAmount: 0 })).toThrow();
    expect(validateCampaign({ title: 'Flood relief', goalAmount: '5000' }).goalAmount).toBe(5000);
    expect(validateCampaign({ raisedAmount: 10 }, { partial: true })).toEqual({ raisedAmount: 10 });
  });
});

describe('access control (QA-1: non-admin gets 403 at the API)', () => {
  test('no session is 401', async () => {
    const app = appAs(null);
    expect((await request(app).get('/api/admin/reports')).status).toBe(401);
    expect((await request(app).post('/api/admin/campaigns').send({})).status).toBe(401);
  });

  test('a student cannot read the queue or write campaigns', async () => {
    const app = appAs('student');
    expect((await request(app).get('/api/admin/reports')).status).toBe(403);
    expect((await request(app).post('/api/admin/campaigns').send({ title: 'Nope', goalAmount: 10 })).status).toBe(403);
    expect((await request(app).put('/api/admin/campaigns/1').send({ title: 'Nope' })).status).toBe(403);
  });

  test('a moderator reads the queue but cannot write campaigns', async () => {
    const app = appAs('moderator');
    expect((await request(app).get('/api/admin/reports')).status).toBe(200);
    expect((await request(app).post('/api/admin/campaigns').send({ title: 'Nope', goalAmount: 10 })).status).toBe(403);
  });
});

describe('reports', () => {
  test('a report from any user shows in the moderation queue', async () => {
    const student = appAs('student');
    const res = await request(student).post('/api/admin/reports').send({ targetType: 'ride', targetId: '42', reason: 'spam' });
    expect(res.status).toBe(202);

    const queue = await request(appAs('moderator')).get('/api/admin/reports');
    expect(queue.body.total).toBe(1);
    expect(queue.body.items[0]).toMatchObject({ targetType: 'ride', targetId: '42', reason: 'spam', status: 'open' });
  });

  test('reporting the same target twice does not duplicate', async () => {
    const student = appAs('student');
    await request(student).post('/api/admin/reports').send({ targetType: 'ride', targetId: '42' });
    const again = await request(student).post('/api/admin/reports').send({ targetType: 'ride', targetId: '42' });
    expect(again.body.duplicate).toBe(true);
    expect(global.__adminDb.reports).toHaveLength(1);
  });

  test('missing target is a 400', async () => {
    expect((await request(appAs('student')).post('/api/admin/reports').send({})).status).toBe(400);
  });
});

describe('donation campaigns', () => {
  test('admin creates and edits; students list and read with correct progress', async () => {
    const admin = appAs('admin');
    const created = await request(admin).post('/api/admin/campaigns').send({ title: 'Flood relief', goalAmount: 1000, raisedAmount: 500 });
    expect(created.status).toBe(201);
    expect(created.body.campaign.progress).toBe(50);

    const id = created.body.campaign.id;
    const edited = await request(admin).put(`/api/admin/campaigns/${id}`).send({ raisedAmount: 1000 });
    expect(edited.body.campaign.progress).toBe(100);

    const student = appAs('student');
    const list = await request(student).get('/api/admin/campaigns');
    expect(list.body.items).toHaveLength(1);
    expect((await request(student).get(`/api/admin/campaigns/${id}`)).body.campaign.title).toBe('Flood relief');
  });

  test('drafts are hidden from students (404) but visible to admins', async () => {
    const admin = appAs('admin');
    const { body } = await request(admin).post('/api/admin/campaigns').send({ title: 'Secret draft', goalAmount: 10, status: 'draft' });
    const id = body.campaign.id;

    const student = appAs('student');
    expect((await request(student).get('/api/admin/campaigns')).body.items).toHaveLength(0);
    expect((await request(student).get(`/api/admin/campaigns/${id}`)).status).toBe(404);
    expect((await request(appAs('admin')).get(`/api/admin/campaigns/${id}`)).status).toBe(200);
  });

  test('invalid input is a 400 with per-field details', async () => {
    const res = await request(appAs('admin')).post('/api/admin/campaigns').send({ title: 'x', goalAmount: -5 });
    expect(res.status).toBe(400);
    expect(Object.keys(res.body.details).sort()).toEqual(['goalAmount', 'title']);
  });

  test('unknown or malformed id is a 404', async () => {
    const app = appAs('student');
    expect((await request(app).get('/api/admin/campaigns/not-an-id')).status).toBe(404);
  });
});
