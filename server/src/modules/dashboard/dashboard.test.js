process.env.NODE_ENV = 'test';
process.env.VITE_DEV_FAKE_AUTH = 'true'; // requests are the demo user "demo-ahmed-khan"

// In-memory stand-in for the Mongoose model, so these tests need no database.
jest.mock('./models/Notification', () => {
  const rows = [];
  let n = 0;
  const matches = (row, q) => Object.entries(q).every(([k, v]) => String(row[k]) === String(v));
  const wrap = (r) => ({ ...r, toPublic: () => ({ id: r._id, type: r.type, title: r.title, body: r.body, link: r.link, read: r.read, createdAt: r.createdAt }) });
  return {
    __rows: rows,
    create: async (data) => {
      const r = { _id: (++n).toString(16).padStart(24, '0'), read: false, createdAt: new Date(2026, 0, n), ...data };
      rows.push(r);
      return wrap(r);
    },
    find: (q) => {
      let list = rows.filter((r) => matches(r, q)).sort((a, b) => b.createdAt - a.createdAt);
      const chain = { sort: () => chain, skip: (k) => ((list = list.slice(k)), chain), limit: (k) => ((list = list.slice(0, k)), chain),
        then: (res, rej) => Promise.resolve(list.map(wrap)).then(res, rej) };
      return chain;
    },
    countDocuments: async (q) => rows.filter((r) => matches(r, q)).length,
    findOneAndUpdate: async (q, patch) => {
      const r = rows.find((x) => matches(x, q));
      if (!r) return null;
      Object.assign(r, patch);
      return wrap(r);
    },
    updateMany: async (q, patch) => rows.filter((r) => matches(r, q)).forEach((r) => Object.assign(r, patch)),
  };
});

const request = require('supertest');
const { createApp } = require('../../core/app');
const { notify } = require('./notify');
const Notification = require('./models/Notification');

const app = createApp();
const ME = 'demo-ahmed-khan';

beforeEach(() => (Notification.__rows.length = 0));

describe('notify()', () => {
  test('creates a notification for the user', async () => {
    const n = await notify(ME, { type: 'ride', title: 'Seat accepted', body: 'Driver accepted', link: '/rides/123' });
    expect(n).toMatchObject({ title: 'Seat accepted', link: '/rides/123', read: false });
    expect(Notification.__rows).toHaveLength(1);
  });

  test('drops off-site links and ignores calls without a user or title', async () => {
    expect((await notify(ME, { title: 'x', link: 'https://evil.com' })).link).toBe('');
    expect((await notify(ME, { title: 'x', link: '//evil.com' })).link).toBe('');
    expect(await notify(null, { title: 'x' })).toBeNull();
    expect(await notify(ME, {})).toBeNull();
  });

  test('never throws when storing fails', async () => {
    const spy = jest.spyOn(Notification, 'create').mockRejectedValueOnce(new Error('db down'));
    await expect(notify(ME, { title: 'x' })).resolves.toBeNull();
    spy.mockRestore();
  });
});

describe('notification API', () => {
  test('list, unread count and filter', async () => {
    await notify(ME, { title: 'one' });
    await notify(ME, { title: 'two' });
    await notify('someone-else', { title: 'not mine' });

    const all = await request(app).get('/api/dashboard/notifications');
    expect(all.status).toBe(200);
    expect(all.body.items.map((i) => i.title)).toEqual(['two', 'one']); // newest first, own only
    expect(all.body.unread).toBe(2);

    expect((await request(app).get('/api/dashboard/notifications/unread-count')).body).toEqual({ unread: 2 });
  });

  test('mark one read lowers the unread count; the unread filter hides it', async () => {
    const a = await notify(ME, { title: 'a' });
    await notify(ME, { title: 'b' });

    const res = await request(app).post(`/api/dashboard/notifications/${a.id}/read`);
    expect(res.status).toBe(200);
    expect(res.body.unread).toBe(1);

    const unread = await request(app).get('/api/dashboard/notifications?filter=unread');
    expect(unread.body.items.map((i) => i.title)).toEqual(['b']);
  });

  test('mark all read', async () => {
    await notify(ME, { title: 'a' });
    await notify(ME, { title: 'b' });
    expect((await request(app).post('/api/dashboard/notifications/read-all')).body).toEqual({ unread: 0 });
    expect((await request(app).get('/api/dashboard/notifications/unread-count')).body.unread).toBe(0);
  });

  test("someone else's notification is a 404 and stays unread", async () => {
    const theirs = await notify('someone-else', { title: 'private' });
    const res = await request(app).post(`/api/dashboard/notifications/${theirs.id}/read`);
    expect(res.status).toBe(404);
    expect(Notification.__rows.find((r) => r._id === theirs.id).read).toBe(false);
  });
});
