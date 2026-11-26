process.env.NODE_ENV = 'test';

// Captures the query so the filter itself can be asserted, and returns canned rows.
global.__contacts = { query: null, rows: [] };
jest.mock('./models/User', () => ({
  find: (query) => {
    global.__contacts.query = query;
    const c = { select: () => c, lean: async () => global.__contacts.rows };
    return c;
  },
}));

const request = require('supertest');
const { createApp } = require('../../core/app');
const { contactForNotifications } = require('./contacts');

const A = 'a'.repeat(24);
const B = 'b'.repeat(24);

beforeEach(() => {
  global.__contacts.query = null;
  global.__contacts.rows = [{ _id: A, name: 'Ahmed Khan', email: 'ahmed@students.nust.edu.pk' }];
});

describe('contactForNotifications (used by the dashboard email digest)', () => {
  test('returns id, name and email', async () => {
    expect(await contactForNotifications([A])).toEqual([{ id: A, name: 'Ahmed Khan', email: 'ahmed@students.nust.edu.pk' }]);
  });

  test('only asks for verified, not-suspended users who have not opted out', async () => {
    await contactForNotifications([A, B]);
    expect(global.__contacts.query).toEqual({
      _id: { $in: [A, B] },
      verified: true,
      suspended: { $ne: true },
      'settings.emailNotifications': { $ne: false },
    });
  });

  test('drops malformed and duplicate ids, and skips the database for an empty list', async () => {
    await contactForNotifications([A, A, 'demo-ahmed-khan', 'x']);
    expect(global.__contacts.query._id.$in).toEqual([A]);
    global.__contacts.query = null;
    expect(await contactForNotifications(['demo-ahmed-khan'])).toEqual([]);
    expect(await contactForNotifications()).toEqual([]);
    expect(global.__contacts.query).toBeNull();
  });

  test('is on the manifest for in-process use, and no HTTP route exposes it or any email', () => {
    const app = createApp();
    const manifest = app.locals.modules.get('auth');
    expect(typeof manifest.contactForNotifications).toBe('function');
    const paths = manifest.router.stack.filter((l) => l.route).map((l) => l.route.path);
    expect(paths.some((p) => /contact/i.test(p))).toBe(false);
    return request(app).get('/api/auth/contacts').expect(404);
  });
});
