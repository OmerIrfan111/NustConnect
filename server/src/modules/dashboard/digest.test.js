process.env.NODE_ENV = 'test';
process.env.VITE_DEV_FAKE_AUTH = 'true';

// In-memory notification model with the few query operators the digest uses.
global.__nt = { rows: [] };
jest.mock('./models/Notification', () => {
  const { rows } = global.__nt;
  let n = 0;
  const ok = (row, q) =>
    Object.entries(q).every(([k, v]) => {
      if (v && typeof v === 'object' && '$gte' in v) return row[k] >= v.$gte;
      if (v && typeof v === 'object' && '$in' in v) return v.$in.includes(row[k]);
      return row[k] === v;
    });
  const wrap = (r) => Object.assign(r, { toPublic: () => ({ id: r._id, title: r.title, link: r.link, read: r.read, important: r.important }) });
  return {
    create: async (d) => {
      const r = { _id: String(++n), read: false, important: false, emailedAt: null, createdAt: new Date(), ...d };
      rows.push(r);
      return wrap(r);
    },
    find: (q) => {
      let list = rows.filter((r) => ok(r, q));
      const c = { limit: (k) => ((list = list.slice(0, k)), c), then: (res, rej) => Promise.resolve(list).then(res, rej) };
      return c;
    },
    updateMany: async (q, patch) => rows.filter((r) => ok(r, q)).forEach((r) => Object.assign(r, patch)),
    countDocuments: async () => 0,
  };
});

const request = require('supertest');
const { createApp } = require('../../core/app');
const { notify } = require('./notify');
const { runDigest, compose } = require('./digest');
const { recommended } = require('./aggregate');

const rows = () => global.__nt.rows;
const NOW = new Date('2026-11-24T12:00:00Z');
const hoursAgo = (h) => new Date(NOW.getTime() - h * 3600 * 1000);
const authWith = (contacts) => new Map([['auth', { slug: 'auth', contactForNotifications: async (ids) => contacts.filter((c) => ids.includes(c.id)) }]]);

beforeEach(() => (rows().length = 0));

describe('notify() important flag', () => {
  test('is stored only when explicitly true', async () => {
    await notify('u1', { title: 'a', important: true });
    await notify('u1', { title: 'b', important: 'yes' });
    await notify('u1', { title: 'c' });
    expect(rows().map((r) => r.important)).toEqual([true, false, false]);
  });
});

describe('email digest', () => {
  const add = (over) => rows().push({ _id: String(rows().length + 1), userId: 'u1', title: 'Seat accepted', body: '', link: '/rides/9', read: false, important: true, emailedAt: null, createdAt: hoursAgo(2), ...over });

  test('one email per user listing their important unread items, then marks them emailed', async () => {
    add({ title: 'Seat accepted' });
    add({ title: 'Complaint resolved', link: '/complaints/4' });
    add({ userId: 'u2', title: 'Bill due', link: '/bills/1' });
    const send = jest.fn(async () => true);
    const result = await runDigest(authWith([{ id: 'u1', name: 'Ahmed', email: 'a@x.pk' }, { id: 'u2', name: 'Bilal', email: 'b@x.pk' }]), { now: NOW, send });

    expect(result).toEqual({ users: 2, emails: 2, notifications: 3 });
    expect(send).toHaveBeenCalledTimes(2);
    const first = send.mock.calls.find(([m]) => m.to === 'a@x.pk')[0];
    expect(first.subject).toBe('NUSTConnect: 2 important updates for you');
    expect(first.text).toContain('Seat accepted');
    expect(first.text).toContain('/complaints/4');
    expect(rows().every((r) => r.emailedAt)).toBe(true);
  });

  test('never emails the same item twice, and ignores read, old, unimportant and already emailed items', async () => {
    add({ title: 'fresh' });
    add({ title: 'ALREADY-READ', read: true });
    add({ title: 'TOO-OLD', createdAt: hoursAgo(60) });
    add({ title: 'MINOR-ITEM', important: false });
    add({ title: 'ALREADY-SENT', emailedAt: hoursAgo(1) });
    const send = jest.fn(async () => true);
    const reg = authWith([{ id: 'u1', name: 'Ahmed', email: 'a@x.pk' }]);

    expect((await runDigest(reg, { now: NOW, send })).notifications).toBe(1);
    expect(send.mock.calls[0][0].text).toContain('fresh');
    expect(send.mock.calls[0][0].text).not.toMatch(/ALREADY-READ|TOO-OLD|MINOR-ITEM|ALREADY-SENT/);
    expect(await runDigest(reg, { now: NOW, send })).toEqual({ users: 0, emails: 0, notifications: 0 }); // second run: nothing left
    expect(send).toHaveBeenCalledTimes(1);
  });

  test('users who opted out (not returned by the auth contract) get nothing and keep their items unmarked', async () => {
    add({});
    const send = jest.fn(async () => true);
    const result = await runDigest(authWith([]), { now: NOW, send });
    expect(result).toMatchObject({ emails: 0 });
    expect(send).not.toHaveBeenCalled();
    expect(rows()[0].emailedAt).toBeNull();
  });

  test('without the auth contract nothing is sent', async () => {
    add({});
    const send = jest.fn(async () => true);
    expect(await runDigest(new Map(), { now: NOW, send })).toMatchObject({ emails: 0, skipped: 'no-auth-contract' });
    expect(send).not.toHaveBeenCalled();
  });

  test('a failed send leaves the items unmarked so the next run retries', async () => {
    add({});
    const result = await runDigest(authWith([{ id: 'u1', name: 'Ahmed', email: 'a@x.pk' }]), { now: NOW, send: async () => false });
    expect(result.emails).toBe(0);
    expect(rows()[0].emailedAt).toBeNull();
  });

  test('compose pluralises and links to the app', () => {
    const one = compose({ name: 'Ahmed', email: 'a@x.pk' }, [{ title: 'Seat accepted', body: 'Murree', link: '/rides/9' }]);
    expect(one.subject).toBe('NUSTConnect: 1 important update for you');
    expect(one.text).toContain('Seat accepted: Murree');
    expect(one.text).toContain('/notifications');
  });
});

describe('POST /api/dashboard/digest/run', () => {
  const app = createApp();
  afterEach(() => delete process.env.DIGEST_KEY);

  test('does not exist without a DIGEST_KEY', async () => {
    expect((await request(app).post('/api/dashboard/digest/run')).status).toBe(404);
  });

  test('needs the right key', async () => {
    process.env.DIGEST_KEY = 'secret-key-123';
    expect((await request(app).post('/api/dashboard/digest/run')).status).toBe(401);
    expect((await request(app).post('/api/dashboard/digest/run').set('X-Digest-Key', 'wrong-key-1234')).status).toBe(401);
    expect((await request(app).post('/api/dashboard/digest/run').set('X-Digest-Key', 'short')).status).toBe(401);
  });

  test('with the key it runs the digest', async () => {
    process.env.DIGEST_KEY = 'secret-key-123';
    const res = await request(app).post('/api/dashboard/digest/run').set('X-Digest-Key', 'secret-key-123');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ users: 0, emails: 0, notifications: 0 });
  });
});

describe('recommended opportunities', () => {
  const opp = (id) => ({ id, title: `Intern ${id}`, snippet: 'Systems Ltd', type: 'opportunity', url: `/opportunities/${id}` });
  const reviews = (fn) => new Map([['reviews', { slug: 'reviews', searchProvider: fn }]]);

  test('takes up to three opportunity results from the reviews provider', async () => {
    const reg = reviews(async () => [opp(1), { id: '9', title: 'A review', type: 'review', url: '/reviews/9' }, opp(2), opp(3), opp(4)]);
    const items = await recommended(reg);
    expect(items.map((i) => i.id)).toEqual(['1', '2', '3']);
    expect(Object.keys(items[0]).sort()).toEqual(['id', 'snippet', 'title', 'url']);
  });

  test('asks the provider for opportunities', async () => {
    const spy = jest.fn(async () => []);
    await recommended(reviews(spy));
    expect(spy).toHaveBeenCalledWith('', { limit: 10, type: 'opportunity' });
  });

  test('no provider, a failing provider or off-site links give an empty list', async () => {
    expect(await recommended(new Map())).toEqual([]);
    expect(await recommended(reviews(async () => { throw new Error('x'); }))).toEqual([]);
    expect(await recommended(reviews(async () => [{ ...opp(1), url: 'https://evil.com' }]))).toEqual([]);
  });

  test('the endpoint returns { items } and needs a session', async () => {
    const app = createApp();
    app.locals.modules.set('reviews', { slug: 'reviews', searchProvider: async () => [opp(1)] });
    const res = await request(app).get('/api/dashboard/recommended');
    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);
  });
});
