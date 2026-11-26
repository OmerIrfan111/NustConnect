process.env.NODE_ENV = 'test';

const request = require('supertest');
const mongoose = require('mongoose');

// ---- in-memory stand-ins for the Mongoose models (tests need no database and no other modules) ----
const mockLocations = [];
const mockGuides = [];
const mockBills = [];
const mockNotify = jest.fn();

const mockId = () => new mongoose.Types.ObjectId().toString();
const mockPath = (doc, p) => p.split('.').reduce((acc, key) => (Array.isArray(acc) ? acc.map((x) => x?.[key]) : acc?.[key]), doc);

function mockMatches(doc, query = {}) {
  for (const [k, v] of Object.entries(query)) {
    if (k === '$or') {
      if (!v.some((sub) => mockMatches(doc, sub))) return false;
      continue;
    }
    const raw = mockPath(doc, k);
    const vals = Array.isArray(raw) ? raw : [raw];
    if (v && typeof v === 'object' && !(v instanceof Date)) {
      if ('$ne' in v && vals.some((x) => x === v.$ne)) return false;
      if ('$in' in v && !vals.some((x) => v.$in.includes(x))) return false;
      if ('$regex' in v) {
        const re = new RegExp(v.$regex, v.$options || '');
        if (!vals.some((x) => re.test(String(x ?? '')))) return false;
      }
      continue;
    }
    if (!vals.some((x) => String(x) === String(v))) return false;
  }
  return true;
}

function mockChain(rows, wrap) {
  let list = [...rows];
  const chain = {
    sort: () => {
      list.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
      return chain;
    },
    limit: (n) => {
      list = list.slice(0, n);
      return chain;
    },
    lean: () => Promise.resolve(list.map((r) => ({ ...r }))),
    then: (resolve, reject) => Promise.resolve(list.map(wrap)).then(resolve, reject),
  };
  return chain;
}

jest.mock('../dashboard/notify', () => ({ notify: (...args) => mockNotify(...args) }));

jest.mock('./models/Location', () => {
  const actual = jest.requireActual('./models/Location');
  const wrap = (raw) => ({ ...raw, toPublic: () => actual.prototype.toPublic.call({ ...raw }) });
  return {
    LOCATION_CATEGORIES: actual.LOCATION_CATEGORIES,
    SAMPLE_LOCATIONS: actual.SAMPLE_LOCATIONS,
    find: (q = {}) => mockChain(mockLocations.filter((d) => mockMatches(d, q)), wrap),
    findByIdAndUpdate: async (id, update) => {
      const hit = mockLocations.find((d) => String(d._id) === String(id));
      if (hit) Object.assign(hit, update.$set);
      return hit ? wrap(hit) : null;
    },
  };
});

jest.mock('./models/Guide', () => {
  const actual = jest.requireActual('./models/Guide');
  const wrap = (raw) => ({ ...raw, toPublic: () => actual.prototype.toPublic.call({ ...raw }) });
  return {
    GUIDE_SECTIONS: actual.GUIDE_SECTIONS,
    SAMPLE_GUIDES: actual.SAMPLE_GUIDES,
    find: (q = {}) => mockChain(mockGuides.filter((d) => mockMatches(d, q)), wrap),
  };
});

jest.mock('./models/Bill', () => {
  const actual = jest.requireActual('./models/Bill');
  const wrap = (raw) => {
    const bill = {
      ...raw,
      toPublic() {
        return actual.prototype.toPublic.call(this);
      },
      async save() {
        const idx = mockBills.findIndex((b) => String(b._id) === String(this._id));
        const fields = { ...this };
        delete fields.toPublic;
        delete fields.save;
        if (idx >= 0) mockBills[idx] = fields;
        return this;
      },
    };
    return bill;
  };
  return {
    SPLIT_METHODS: actual.SPLIT_METHODS,
    find: (q = {}) => mockChain(mockBills.filter((d) => mockMatches(d, q)), wrap),
    countDocuments: async (q = {}) => mockBills.filter((d) => mockMatches(d, q)).length,
    findById: async (id) => {
      const hit = mockBills.find((d) => String(d._id) === String(id));
      return hit ? wrap(hit) : null;
    },
    create: async (data) => {
      const now = new Date();
      const doc = { _id: mockId(), status: 'open', hidden: false, reminderSentAt: null, items: [], payments: [], createdAt: now, updatedAt: now, ...data };
      mockBills.push(doc);
      return wrap(doc);
    },
    deleteOne: async (q) => {
      const idx = mockBills.findIndex((d) => mockMatches(d, q));
      if (idx >= 0) mockBills.splice(idx, 1);
      return { deletedCount: idx >= 0 ? 1 : 0 };
    },
    deleteMany: async (q) => {
      let deletedCount = 0;
      for (let i = mockBills.length - 1; i >= 0; i -= 1) {
        if (mockMatches(mockBills[i], q)) {
          mockBills.splice(i, 1);
          deletedCount += 1;
        }
      }
      return { deletedCount };
    },
    updateMany: async () => ({}),
    findByIdAndUpdate: async (id, update) => {
      const hit = mockBills.find((d) => String(d._id) === String(id));
      if (hit) Object.assign(hit, update.$set);
      return hit ? wrap(hit) : null;
    },
  };
});

const { computeSplits, toCents, divideEvenly, buildSettlementSummary } = require('./billMath');

/** Builds a fresh app for one role (session reads the fake-auth env at import time) or with no session at all. */
function buildApp({ role = 'student', session = true } = {}) {
  jest.resetModules();
  if (session) {
    process.env.VITE_DEV_FAKE_AUTH = 'true';
    process.env.VITE_DEV_FAKE_ROLE = role;
  } else {
    process.env.VITE_DEV_FAKE_AUTH = 'false';
  }
  const { createApp } = require('../../core/app');
  const app = createApp();
  return { app, manifest: require('./index'), billController: require('./controllers/billController') };
}

const people = (...ids) => ids.map((id) => ({ userId: id, name: `User ${id}` }));
const sum = (rows, key) => rows.reduce((n, r) => n + r[key], 0);

beforeEach(() => {
  mockLocations.length = 0;
  mockGuides.length = 0;
  mockBills.length = 0;
  mockNotify.mockClear();
});

describe('bill maths: every split adds up to the cent (QA-2, QA-3)', () => {
  test('toCents avoids float errors', () => {
    expect(toCents(19.99)).toBe(1999);
    expect(toCents(0.1 + 0.2)).toBe(30);
    expect(toCents(-5)).toBeNaN();
    expect(toCents('abc')).toBeNaN();
  });

  test.each([
    [10000, 3],
    [1, 3],
    [100, 7],
    [999999, 13],
    [5, 5],
  ])('divideEvenly(%i, %i) sums exactly to the total', (total, n) => {
    const shares = divideEvenly(total, n);
    expect(shares).toHaveLength(n);
    expect(sum(shares.map((s) => ({ s })), 's')).toBe(total);
    expect(Math.max(...shares) - Math.min(...shares)).toBeLessThanOrEqual(1);
  });

  test('equal split of PKR 100.00 between 3 is 33.34 / 33.33 / 33.33', () => {
    const { participants } = computeSplits({ totalCents: 10000, splitMethod: 'equal', participants: people('a', 'b', 'c') });
    expect(participants.map((p) => p.owedCents)).toEqual([3334, 3333, 3333]);
  });

  test('custom split must add up exactly', () => {
    const ok = computeSplits({
      totalCents: 10000,
      splitMethod: 'custom',
      participants: [
        { ...people('a')[0], owedAmount: 25.5 },
        { ...people('b')[0], owedAmount: 74.5 },
      ],
    });
    expect(sum(ok.participants, 'owedCents')).toBe(10000);
    expect(() =>
      computeSplits({
        totalCents: 10000,
        splitMethod: 'custom',
        participants: [
          { ...people('a')[0], owedAmount: 25 },
          { ...people('b')[0], owedAmount: 74.99 },
        ],
      }),
    ).toThrow(/sum to/);
  });

  test('by-item split shares each item among its people, odd paisa included', () => {
    const { participants, items } = computeSplits({
      totalCents: 3001,
      splitMethod: 'item',
      participants: people('a', 'b', 'c'),
      items: [
        { label: 'Pizza', amountCents: 2001, sharedBy: ['a', 'b', 'c'] },
        { label: 'Juice', amountCents: 1000, sharedBy: ['b'] },
      ],
    });
    expect(sum(participants, 'owedCents')).toBe(3001);
    expect(participants.find((p) => p.userId === 'b').owedCents).toBe(667 + 1000);
    expect(items).toHaveLength(2);
    expect(() =>
      computeSplits({ totalCents: 5000, splitMethod: 'item', participants: people('a'), items: [{ label: 'x', amountCents: 100, sharedBy: ['a'] }] }),
    ).toThrow(/Items sum to/);
  });

  test('rejects an empty bill, a duplicate person and an unknown method', () => {
    expect(() => computeSplits({ totalCents: 0, splitMethod: 'equal', participants: people('a') })).toThrow();
    expect(() => computeSplits({ totalCents: 100, splitMethod: 'equal', participants: [] })).toThrow();
    expect(() => computeSplits({ totalCents: 100, splitMethod: 'equal', participants: people('a', 'a') })).toThrow(/Duplicate/);
    expect(() => computeSplits({ totalCents: 100, splitMethod: 'weird', participants: people('a') })).toThrow(/Split method/);
  });

  test('settle-up lists only what is still owed to the creator', () => {
    const transfers = buildSettlementSummary({
      creatorId: 'a',
      creatorName: 'A',
      participants: [
        { userId: 'a', name: 'A', owedCents: 500, paidCents: 500 },
        { userId: 'b', name: 'B', owedCents: 500, paidCents: 200 },
        { userId: 'c', name: 'C', owedCents: 500, paidCents: 500 },
      ],
    });
    expect(transfers).toEqual([expect.objectContaining({ fromUserId: 'b', amountCents: 300, amount: 3 })]);
  });
});

describe('public map and guide (QA-1)', () => {
  test('guests can open the locations and guide endpoints; bills still need a login', async () => {
    const { app } = buildApp({ session: false });
    const locations = await request(app).get('/api/campus/locations');
    expect(locations.status).toBe(200);
    expect(locations.body).toHaveLength(5);
    expect(locations.body[0]).toEqual(expect.objectContaining({ id: expect.any(String), name: expect.any(String), category: expect.any(String), lat: expect.any(Number), lng: expect.any(Number) }));

    const guides = await request(app).get('/api/campus/guides');
    expect(guides.status).toBe(200);
    expect(guides.body.guides.length).toBeGreaterThan(0);

    expect((await request(app).get('/api/campus/bills')).status).toBe(401);
  });

  test('sample fallback honours the category filter and the search word', async () => {
    const { app } = buildApp({ session: false });
    const food = await request(app).get('/api/campus/locations?category=food');
    expect(food.body.map((l) => l.name)).toEqual(['Concordia Food Court']);
    const hostel = await request(app).get('/api/campus/locations?q=hostel');
    expect(hostel.body.map((l) => l.name)).toEqual(['Boys Hostel Block']);
    // the search also looks at the landmark text, so "library" finds the food court that is "near Central Library"
    const library = await request(app).get('/api/campus/locations?q=library');
    expect(library.body.map((l) => l.name).sort()).toEqual(['Central Library', 'Concordia Food Court']);
  });

  test('with a database, visible locations come from it and hidden ones are left out', async () => {
    const { app } = buildApp({ session: false });
    app.locals.campusAssumeDb = true;
    const row = (name, extra = {}) => ({ _id: mockId(), name, category: 'academic', lat: 33.6, lng: 72.9, hidden: false, createdAt: new Date(), ...extra });
    mockLocations.push(row('Real Lab'), row('Secret Lab', { hidden: true }));
    const res = await request(app).get('/api/campus/locations');
    expect(res.body.map((l) => l.name)).toEqual(['Real Lab']);
    expect(res.body[0].directionsUrl).toContain('openstreetmap.org');
  });
});

describe('bills: creation, privacy and permissions (QA-1, QA-2)', () => {
  const create = (app, body) => request(app).post('/api/campus/bills').send(body);
  const seedOthersBill = (extra = {}) => {
    const doc = {
      _id: mockId(),
      title: 'Hostel pizza',
      description: '',
      totalCents: 30000,
      splitMethod: 'equal',
      creatorId: 'sample-user-1',
      creatorName: 'Ayesha Malik',
      participants: [
        { userId: 'sample-user-1', name: 'Ayesha Malik', owedCents: 15000, paidCents: 15000 },
        { userId: 'demo-ahmed-khan', name: 'Ahmed Khan', owedCents: 15000, paidCents: 0 },
      ],
      items: [],
      payments: [],
      status: 'open',
      hidden: false,
      createdAt: new Date(),
      ...extra,
    };
    mockBills.push(doc);
    return doc;
  };

  test('a bill with 3 participants is saved, viewable, and its shares add up (QA-1)', async () => {
    const { app } = buildApp();
    const res = await create(app, { title: 'Murree cabin', total: 1000, splitMethod: 'equal', participants: [...people('p2', 'p3')] });
    expect(res.status).toBe(201);
    const bill = res.body.bill;
    expect(bill.participants).toHaveLength(3);
    expect(sum(bill.participants, 'owedCents')).toBe(100000);
    // the creator paid, so their own share is already settled
    expect(bill.participants.find((p) => p.userId === 'demo-ahmed-khan')).toEqual(expect.objectContaining({ balanceCents: 0 }));
    expect(bill.status).toBe('open');

    const read = await request(app).get(`/api/campus/bills/${bill.id}`);
    expect(read.status).toBe(200);
    expect(read.body.isCreator).toBe(true);
    expect(read.body.settlement).toHaveLength(2);

    const list = await request(app).get('/api/campus/bills');
    expect(list.body.bills).toHaveLength(1);
  });

  test('everyone else on the bill is notified with a deep link (creation)', async () => {
    const { app } = buildApp();
    const res = await create(app, { title: 'Dinner', total: 600, participants: people('p2', 'p3') });
    expect(mockNotify).toHaveBeenCalledTimes(2);
    expect(mockNotify).toHaveBeenCalledWith('p2', expect.objectContaining({ link: `/bills/${res.body.bill.id}`, type: 'bill' }));
    expect(mockNotify.mock.calls.map((c) => c[0]).sort()).toEqual(['p2', 'p3']);
  });

  test('validation: missing title, bad total, custom that does not add up', async () => {
    const { app } = buildApp();
    expect((await create(app, { total: 100, participants: people('p2') })).status).toBe(400);
    expect((await create(app, { title: 'X1', total: 0, participants: people('p2') })).status).toBe(400);
    const bad = await create(app, {
      title: 'Custom',
      total: 100,
      splitMethod: 'custom',
      participants: [{ ...people('p2')[0], owedAmount: 10 }, { userId: 'demo-ahmed-khan', name: 'x', owedAmount: 10 }],
    });
    expect(bad.status).toBe(400);
    expect(mockBills).toHaveLength(0);
  });

  test('only participants can see a bill: everyone else gets 403 (QA-2)', async () => {
    const { app } = buildApp();
    const stranger = seedOthersBill({
      participants: [
        { userId: 'sample-user-1', name: 'Ayesha Malik', owedCents: 15000, paidCents: 15000 },
        { userId: 'sample-user-2', name: 'Bilal Raza', owedCents: 15000, paidCents: 0 },
      ],
    });
    expect((await request(app).get(`/api/campus/bills/${stranger._id}`)).status).toBe(403);
    expect((await request(app).get('/api/campus/bills')).body.bills).toHaveLength(0);

    const mine = seedOthersBill();
    expect((await request(app).get(`/api/campus/bills/${mine._id}`)).status).toBe(200);
    expect((await request(app).get('/api/campus/bills/not-an-id')).status).toBe(404);
  });

  test('even staff cannot read someone else\'s private bill', async () => {
    const { app } = buildApp({ role: 'admin' });
    const stranger = seedOthersBill({ participants: [{ userId: 'sample-user-1', name: 'A', owedCents: 30000, paidCents: 30000 }] });
    expect((await request(app).get(`/api/campus/bills/${stranger._id}`)).status).toBe(403);
  });

  test('only the creator can edit or delete (QA-2)', async () => {
    const { app } = buildApp();
    const theirs = seedOthersBill();
    expect((await request(app).patch(`/api/campus/bills/${theirs._id}`).send({ title: 'Hacked' })).status).toBe(403);
    expect((await request(app).delete(`/api/campus/bills/${theirs._id}`)).status).toBe(403);

    const made = await create(app, { title: 'Mine', total: 500, participants: people('p2') });
    const edit = await request(app).patch(`/api/campus/bills/${made.body.bill.id}`).send({ title: 'Renamed', total: 800 });
    expect(edit.status).toBe(200);
    expect(edit.body.bill.title).toBe('Renamed');
    expect(sum(edit.body.bill.participants, 'owedCents')).toBe(80000);
    expect((await request(app).delete(`/api/campus/bills/${made.body.bill.id}`)).status).toBe(200);
    expect(mockBills.map((b) => String(b._id))).toEqual([String(theirs._id)]); // only the other person's bill is left
  });

  test('amounts cannot change once a payment was recorded', async () => {
    const { app } = buildApp();
    const made = await create(app, { title: 'Locked', total: 400, participants: people('p2') });
    await request(app).post(`/api/campus/bills/${made.body.bill.id}/payments`).send({ userId: 'p2', amount: 50 });
    const res = await request(app).patch(`/api/campus/bills/${made.body.bill.id}`).send({ total: 900 });
    expect(res.status).toBe(409);
  });
});

describe('payments and balances (QA-2, QA-3)', () => {
  const owe = () => ({
    _id: mockId(),
    title: 'Hostel pizza',
    totalCents: 30000,
    splitMethod: 'equal',
    creatorId: 'sample-user-1',
    creatorName: 'Ayesha Malik',
    participants: [
      { userId: 'sample-user-1', name: 'Ayesha Malik', owedCents: 15000, paidCents: 15000 },
      { userId: 'demo-ahmed-khan', name: 'Ahmed Khan', owedCents: 15000, paidCents: 0 },
    ],
    items: [],
    payments: [],
    status: 'open',
    hidden: false,
    createdAt: new Date(),
  });

  test('a participant records their own payment; balances update and the bill settles', async () => {
    const { app } = buildApp();
    const doc = owe();
    mockBills.push(doc);

    const part = await request(app).post(`/api/campus/bills/${doc._id}/payments`).send({ amount: 100, note: 'cash' });
    expect(part.status).toBe(200);
    const me = part.body.bill.participants.find((p) => p.userId === 'demo-ahmed-khan');
    expect(me).toEqual(expect.objectContaining({ paidCents: 10000, balanceCents: 5000 }));
    expect(part.body.bill.status).toBe('open');
    expect(mockNotify).toHaveBeenCalledWith('sample-user-1', expect.objectContaining({ title: 'Payment recorded', link: `/bills/${doc._id}` }));

    const rest = await request(app).post(`/api/campus/bills/${doc._id}/payments`).send({ amount: 50 });
    expect(rest.body.bill.status).toBe('settled');
    expect(rest.body.settlement).toEqual([]);
    expect(rest.body.bill.payments).toHaveLength(2);
  });

  test('cannot overpay, pay zero, or record for someone else as a participant', async () => {
    const { app } = buildApp();
    const doc = owe();
    mockBills.push(doc);
    expect((await request(app).post(`/api/campus/bills/${doc._id}/payments`).send({ amount: 150.01 })).status).toBe(400);
    expect((await request(app).post(`/api/campus/bills/${doc._id}/payments`).send({ amount: 0 })).status).toBe(400);
    expect((await request(app).post(`/api/campus/bills/${doc._id}/payments`).send({ userId: 'sample-user-1', amount: 1 })).status).toBe(403);
  });

  test('the creator records a payment for another person and that person is notified', async () => {
    const { app } = buildApp();
    const made = await request(app).post('/api/campus/bills').send({ title: 'Trip', total: 300, participants: people('p2', 'p3') });
    mockNotify.mockClear();
    const res = await request(app).post(`/api/campus/bills/${made.body.bill.id}/payments`).send({ userId: 'p2', amount: 100 });
    expect(res.status).toBe(200);
    expect(res.body.bill.participants.find((p) => p.userId === 'p2').balanceCents).toBe(0);
    expect(mockNotify).toHaveBeenCalledWith('p2', expect.objectContaining({ title: 'Payment recorded' }));
    expect((await request(app).post(`/api/campus/bills/${made.body.bill.id}/payments`).send({ userId: 'nobody', amount: 1 })).status).toBe(404);
  });

  test('deadline reminders go to people who still owe, once per due date', async () => {
    const { billController } = buildApp();
    const soon = new Date(Date.now() + 6 * 60 * 60 * 1000);
    mockBills.push({ ...owe(), dueDate: soon });
    mockBills.push({ ...owe(), dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000) });

    expect(await billController.sendDueReminders()).toEqual({ reminded: 1 });
    expect(mockNotify).toHaveBeenCalledWith('demo-ahmed-khan', expect.objectContaining({ title: 'Bill payment due soon' }));
    expect(await billController.sendDueReminders()).toEqual({ reminded: 0 });
  });

  test('the reminder endpoint is admin-only', async () => {
    expect((await request(buildApp().app).post('/api/campus/bills/reminders/run')).status).toBe(403);
    const admin = await request(buildApp({ role: 'admin' }).app).post('/api/campus/bills/reminders/run');
    expect(admin.status).toBe(200);
  });
});

describe('contracts: search, summary, moderation (QA-3)', () => {
  test('searchProvider returns locations and guides, never bills', async () => {
    const { manifest } = buildApp();
    mockLocations.push({ _id: mockId(), name: 'Pizza Point', category: 'food', description: '', landmark: '', hidden: false });
    mockGuides.push({ _id: mockId(), title: 'Pizza etiquette', summary: 'Where to eat', body: '', hidden: false });
    mockBills.push({ _id: mockId(), title: 'Pizza bill', participants: [], hidden: false });
    const out = await manifest.searchProvider('pizza', { limit: 10 });
    expect(out.map((r) => r.type).sort()).toEqual(['guide', 'location']);
    expect(out.every((r) => r.url.startsWith('/'))).toBe(true);
    expect(await manifest.searchProvider('', { limit: 5 })).toEqual([]);
  });

  test('summaryProvider: open bills per user, platform total with no user', async () => {
    const { manifest } = buildApp();
    const base = { hidden: false, items: [], payments: [], createdAt: new Date() };
    mockBills.push({ _id: mockId(), title: 'A', creatorId: 'u1', status: 'open', participants: [{ userId: 'u1' }, { userId: 'u2' }], ...base });
    mockBills.push({ _id: mockId(), title: 'B', creatorId: 'u3', status: 'open', participants: [{ userId: 'u3' }], ...base });
    mockBills.push({ _id: mockId(), title: 'C', creatorId: 'u1', status: 'settled', participants: [{ userId: 'u1' }], ...base });

    const mine = await manifest.summaryProvider('u2');
    expect(mine.stat).toEqual({ label: 'Open Bills', value: 1 });
    expect(mine.recent[0].url).toMatch(/^\/bills\//);
    const all = await manifest.summaryProvider(null, { scope: 'all' });
    expect(all.stat).toEqual({ label: 'Bills Created', value: 3 });
    expect(all.recent).toEqual([]);
  });

  test('a hidden bill vanishes for its participants but staff can still open it; restore reverses it', async () => {
    const { app, manifest } = buildApp();
    const made = await request(app).post('/api/campus/bills').send({ title: 'Reported', total: 200, participants: people('p2') });
    const id = made.body.bill.id;

    expect(await manifest.moderationHooks.hide(id)).toBe(true);
    expect((await request(app).get(`/api/campus/bills/${id}`)).status).toBe(404);
    expect((await request(app).get('/api/campus/bills')).body.bills).toHaveLength(0);
    expect((await request(buildApp({ role: 'moderator' }).app).get(`/api/campus/bills/${id}`)).status).toBe(200);

    expect(await manifest.moderationHooks.restore(id)).toBe(true);
    expect((await request(app).get(`/api/campus/bills/${id}`)).status).toBe(200);
    expect(await manifest.moderationHooks.hide('bad-id')).toBe(false);
  });

  test('deleteUserData removes the bills a user created', async () => {
    const { manifest } = buildApp();
    mockBills.push({ _id: mockId(), title: 'Mine', creatorId: 'gone', participants: [] });
    mockBills.push({ _id: mockId(), title: 'Theirs', creatorId: 'other', participants: [] });
    expect(await manifest.deleteUserData('gone')).toEqual({ deleted: 1 });
    expect(mockBills).toHaveLength(1);
  });
});
