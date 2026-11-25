process.env.NODE_ENV = 'test';
process.env.VITE_DEV_FAKE_AUTH = 'true';
process.env.VITE_DEV_FAKE_ROLE = 'student';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const request = require('supertest');
const mongoose = require('mongoose');

// In-memory Mongoose model mocks so tests run without MongoDB or network.
const mockItemStore = [];
const mockClaimStore = [];
const mockNotify = jest.fn();

jest.mock('../dashboard/notify', () => ({ notify: (...args) => mockNotify(...args) }));

const mockMakeId = () => new mongoose.Types.ObjectId().toString();

function mockMatchesQuery(doc, query = {}) {
  for (const [k, v] of Object.entries(query)) {
    if (k === '$or') {
      const ok = v.some((sub) => mockMatchesQuery(doc, sub));
      if (!ok) return false;
      continue;
    }
    if (v && typeof v === 'object' && !(v instanceof Date) && !Array.isArray(v)) {
      if ('$ne' in v && doc[k] === v.$ne) return false;
      if ('$gt' in v && !(new Date(doc[k]) > new Date(v.$gt))) return false;
      if ('$gte' in v && !(new Date(doc[k]) >= new Date(v.$gte))) return false;
      if ('$lte' in v && !(new Date(doc[k]) <= new Date(v.$lte))) return false;
      if ('$in' in v && !v.$in.includes(doc[k])) return false;
      if ('$regex' in v) {
        const re = new RegExp(v.$regex, v.$options || '');
        if (!re.test(String(doc[k] || ''))) return false;
      }
      continue;
    }
    if (String(doc[k]) !== String(v)) return false;
  }
  return true;
}

function mockWrapItem(raw) {
  return {
    ...raw,
    toPublic() {
      return {
        id: String(this._id),
        type: this.type,
        title: this.title,
        description: this.description,
        category: this.category,
        location: this.location,
        eventDate: this.eventDate,
        photos: this.photos || [],
        status: this.status,
        ownerId: this.ownerId,
        ownerName: this.ownerName,
        ownerVerified: Boolean(this.ownerVerified),
        ocrStatus: this.ocrStatus,
        manualKeywords: this.manualKeywords || '',
        isSample: Boolean(this.isSample),
        hidden: Boolean(this.hidden),
        expiresAt: this.expiresAt,
        createdAt: this.createdAt,
        updatedAt: this.updatedAt,
      };
    },
    async save() {
      const idx = mockItemStore.findIndex((i) => String(i._id) === String(this._id));
      this.updatedAt = new Date();
      if (idx >= 0) mockItemStore[idx] = { ...this };
      return this;
    },
  };
}

function mockWrapClaim(raw) {
  return {
    ...raw,
    toPublic() {
      return {
        id: String(this._id),
        itemId: String(this.itemId),
        claimantId: this.claimantId,
        claimantName: this.claimantName,
        claimantVerified: Boolean(this.claimantVerified),
        message: this.message,
        status: this.status,
        decisionNote: this.decisionNote || '',
        decidedAt: this.decidedAt || null,
        createdAt: this.createdAt,
        updatedAt: this.updatedAt,
      };
    },
    async save() {
      const idx = mockClaimStore.findIndex((c) => String(c._id) === String(this._id));
      this.updatedAt = new Date();
      if (idx >= 0) mockClaimStore[idx] = { ...this };
      return this;
    },
  };
}

function mockMakeChain(rows, wrapper) {
  let list = [...rows];
  const chain = {
    sort() {
      list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      return chain;
    },
    skip(n) {
      list = list.slice(n);
      return chain;
    },
    limit(n) {
      list = list.slice(0, n);
      return chain;
    },
    select() {
      return chain;
    },
    lean() {
      return Promise.resolve(list.map((r) => ({ ...r })));
    },
    then(resolve, reject) {
      return Promise.resolve(list.map(wrapper)).then(resolve, reject);
    },
  };
  return chain;
}

jest.mock('./models/Item', () => {
  const ItemMock = {
    CATEGORIES: ['id_card', 'electronics', 'books', 'keys', 'accessories', 'documents', 'other'],
    STATUSES: ['open', 'claimed', 'returned'],
    OCR_STATUSES: ['none', 'completed', 'failed', 'manual'],
    find: (q = {}) => mockMakeChain(mockItemStore.filter((d) => mockMatchesQuery(d, q)), mockWrapItem),
    countDocuments: async (q = {}) => mockItemStore.filter((d) => mockMatchesQuery(d, q)).length,
    findById: async (id) => {
      const hit = mockItemStore.find((d) => String(d._id) === String(id));
      return hit ? mockWrapItem(hit) : null;
    },
    create: async (data) => {
      const now = new Date();
      const doc = {
        _id: mockMakeId(),
        photos: [],
        status: 'open',
        ocrStatus: 'none',
        ocrTextMasked: '',
        ocrKeywords: [],
        manualKeywords: '',
        hidden: false,
        expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        createdAt: now,
        updatedAt: now,
        ...data,
      };
      mockItemStore.push(doc);
      return mockWrapItem(doc);
    },
    findByIdAndUpdate: async (id, update) => {
      const hit = mockItemStore.find((d) => String(d._id) === String(id));
      if (!hit) return null;
      Object.assign(hit, update.$set || update);
      return mockWrapItem(hit);
    },
    deleteOne: async (q) => {
      const idx = mockItemStore.findIndex((d) => mockMatchesQuery(d, q));
      if (idx >= 0) {
        mockItemStore.splice(idx, 1);
        return { deletedCount: 1 };
      }
      return { deletedCount: 0 };
    },
    deleteMany: async (q) => {
      let deletedCount = 0;
      for (let i = mockItemStore.length - 1; i >= 0; i -= 1) {
        if (mockMatchesQuery(mockItemStore[i], q)) {
          mockItemStore.splice(i, 1);
          deletedCount += 1;
        }
      }
      return { deletedCount };
    },
  };
  return ItemMock;
});

jest.mock('./models/Claim', () => ({
  find: (q = {}) => mockMakeChain(mockClaimStore.filter((d) => mockMatchesQuery(d, q)), mockWrapClaim),
  findById: async (id) => {
    const hit = mockClaimStore.find((d) => String(d._id) === String(id));
    return hit ? mockWrapClaim(hit) : null;
  },
  findOne: async (q = {}) => {
    const hit = mockClaimStore.find((d) => mockMatchesQuery(d, q));
    return hit ? mockWrapClaim(hit) : null;
  },
  create: async (data) => {
    const now = new Date();
    const doc = { _id: mockMakeId(), status: 'pending', decisionNote: '', createdAt: now, updatedAt: now, ...data };
    mockClaimStore.push(doc);
    return mockWrapClaim(doc);
  },
  updateMany: async (q, update) => {
    for (const c of mockClaimStore) {
      if (mockMatchesQuery(c, q)) Object.assign(c, update.$set || update);
    }
  },
  deleteMany: async (q) => {
    for (let i = mockClaimStore.length - 1; i >= 0; i -= 1) {
      if (mockMatchesQuery(mockClaimStore[i], q)) mockClaimStore.splice(i, 1);
    }
  },
}));

const { createApp } = require('../../core/app');
const { maskSensitiveText, extractOcrFromImage, findMatchesForItem } = require('./ocr');
const manifest = require('./index');

const app = createApp();

beforeEach(() => {
  mockItemStore.length = 0;
  mockClaimStore.length = 0;
  process.env.VITE_DEV_FAKE_ROLE = 'student';
  app.locals.lostfoundOcrRecognizer = undefined;
});

describe('OCR privacy & 10-case test set (QA-2)', () => {
  const OCR_CASES = [
    { name: 'Student card with CNIC', raw: 'NUST SEECS Ali Khan CNIC 61101-1234567-1', forbidden: ['61101-1234567-1'], expectedKw: 'seecs' },
    { name: 'CMS ID card', raw: 'CMS ID 451234 BSCS Batch 2023', forbidden: ['451234'], expectedKw: 'bscs' },
    { name: 'Phone number on sticker', raw: 'If found call 0300-1234567 Casio fx-991', forbidden: ['0300-1234567'], expectedKw: 'casio' },
    { name: 'International +92 phone', raw: 'Owner +92 321 9876543 Laptop Dell', forbidden: ['9876543'], expectedKw: 'dell' },
    { name: 'Email address on notebook', raw: 'Notebook Physics ali.student@students.nust.edu.pk', forbidden: ['ali.student@students.nust.edu.pk'], expectedKw: 'physics' },
    { name: 'Bank debit card digits', raw: 'HBL Card 4111 2222 3333 4444 Fatima', forbidden: ['4111', '4444'], expectedKw: 'fatima' },
    { name: 'Clean calculator text', raw: 'Casio fx-991EX Scientific Calculator Black', forbidden: [], expectedKw: 'scientific' },
    { name: 'Hostel key tag', raw: 'Attar Hostel Room 104 Keychain Blue', forbidden: [], expectedKw: 'attar' },
    { name: '13-digit unformatted CNIC', raw: 'ID 3520212345679 Library Pass', forbidden: ['3520212345679'], expectedKw: 'library' },
    { name: 'Empty / unreadable scan', raw: '   \n  ', forbidden: [], expectedKw: null },
  ];

  test.each(OCR_CASES)('$name masks sensitive data and extracts safe keywords', ({ raw, forbidden, expectedKw }) => {
    const { maskedText, keywords } = maskSensitiveText(raw);
    for (const secret of forbidden) {
      expect(maskedText).not.toContain(secret);
      expect(keywords.join(' ')).not.toContain(secret);
    }
    if (expectedKw) expect(keywords).toContain(expectedKw);
  });

  test('OCR timeout or failure falls back gracefully without throwing', async () => {
    const slowRecognizer = () => new Promise((resolve) => setTimeout(() => resolve('late text'), 200));
    const res = await extractOcrFromImage('/tmp/fake.png', { timeoutMs: 20, recognizer: slowRecognizer });
    expect(res.ok).toBe(false);
    expect(res.ocrStatus).toBe('failed');

    const crashRecognizer = () => Promise.reject(new Error('corrupt image'));
    const res2 = await extractOcrFromImage('/tmp/bad.png', { recognizer: crashRecognizer });
    expect(res2.ok).toBe(false);
    expect(res2.ocrStatus).toBe('failed');
  });
});

describe('Lost & Found API lifecycle & privacy (QA-1..QA-3)', () => {
  test('post lost & found items, filter by type/category, and enforce upload validation', async () => {
    const lost = await request(app).post('/api/lostfound/items').send({
      type: 'lost',
      title: 'Black Casio Calculator',
      description: 'Lost my scientific calculator near SEECS 2nd floor lab.',
      category: 'electronics',
      location: 'SEECS',
      eventDate: '2026-11-20',
      manualKeywords: 'casio 991ex',
    });
    expect(lost.status).toBe(201);
    expect(lost.body.item.type).toBe('lost');

    const tmpImg = path.join(os.tmpdir(), 'nc-lf-test.png');
    fs.writeFileSync(tmpImg, Buffer.from('fake-png-bytes'));
    app.locals.lostfoundOcrRecognizer = async () => 'Casio 991EX SEECS CNIC 61101-1234567-1';

    const found = await request(app)
      .post('/api/lostfound/items')
      .field('type', 'found')
      .field('title', 'Found Casio Calculator')
      .field('description', 'Found a black calculator outside SEECS room 204.')
      .field('category', 'electronics')
      .field('location', 'SEECS')
      .field('eventDate', '2026-11-21')
      .attach('photos', tmpImg);

    fs.unlinkSync(tmpImg);

    expect(found.status).toBe(201);
    expect(found.body.item.ocrStatus).toBe('completed');
    // Privacy: raw/masked OCR text must never be exposed in API responses
    expect(JSON.stringify(found.body)).not.toContain('61101-1234567-1');
    expect(found.body.item.ocrTextMasked).toBeUndefined();

    const listFound = await request(app).get('/api/lostfound/items?type=found&category=electronics');
    expect(listFound.status).toBe(200);
    expect(listFound.body.items).toHaveLength(1);

    // Reject non-image upload
    const tmpTxt = path.join(os.tmpdir(), 'nc-lf-bad.txt');
    fs.writeFileSync(tmpTxt, 'not an image');
    const badUpload = await request(app)
      .post('/api/lostfound/items')
      .field('type', 'found')
      .field('title', 'Bad File Test')
      .field('description', 'Testing that text files are rejected.')
      .field('location', 'Library')
      .attach('photos', tmpTxt);
    fs.unlinkSync(tmpTxt);
    expect(badUpload.status).toBe(400);
  });

  test('OCR failure during upload does not block posting', async () => {
    const tmpImg = path.join(os.tmpdir(), 'nc-lf-fail.png');
    fs.writeFileSync(tmpImg, Buffer.from('fake-png'));
    app.locals.lostfoundOcrRecognizer = async () => {
      throw new Error('tesseract error');
    };

    const res = await request(app)
      .post('/api/lostfound/items')
      .field('type', 'found')
      .field('title', 'Blue Water Bottle')
      .field('description', 'Found near Concordia 1 benches.')
      .field('category', 'other')
      .field('location', 'Concordia 1')
      .attach('photos', tmpImg);

    fs.unlinkSync(tmpImg);
    expect(res.status).toBe(201);
    expect(res.body.item.ocrStatus).toBe('failed');
  });

  test('match suggestions are owner-only (403 for others)', async () => {
    const lost = await request(app).post('/api/lostfound/items').send({
      type: 'lost',
      title: 'Casio Calculator',
      description: 'Lost my Casio calculator in SEECS.',
      category: 'electronics',
      location: 'SEECS',
    });
    const otherFound = await mongoose; // noop
    expect(otherFound).toBeDefined();

    // Seed an opposite item owned by another user directly
    mockItemStore.push({
      _id: mockMakeId(),
      type: 'found',
      title: 'Casio Calculator Found',
      description: 'Found Casio calculator in SEECS.',
      category: 'electronics',
      location: 'SEECS',
      eventDate: new Date(),
      status: 'open',
      ownerId: 'other-user-99',
      ownerName: 'Bilal Raza',
      ownerVerified: true,
      ocrKeywords: ['casio', 'calculator', 'seecs'],
      hidden: false,
      expiresAt: new Date(Date.now() + 86400000),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const ownerMatches = await request(app).get(`/api/lostfound/items/${lost.body.item.id}/matches`);
    expect(ownerMatches.status).toBe(200);
    expect(ownerMatches.body.matches.length).toBeGreaterThanOrEqual(1);

    const otherItemId = String(mockItemStore[1]._id);
    const forbiddenMatches = await request(app).get(`/api/lostfound/items/${otherItemId}/matches`);
    expect(forbiddenMatches.status).toBe(403);
  });

  test('claim flow: claimant submits, owner approves -> item becomes claimed', async () => {
    const otherId = mockMakeId();
    mockItemStore.push({
      _id: otherId,
      type: 'found',
      title: 'Keys with Blue Lanyard',
      description: 'Found near Central Library.',
      category: 'keys',
      location: 'Central Library',
      eventDate: new Date(),
      status: 'open',
      ownerId: 'other-finder-1',
      ownerName: 'Ayesha Malik',
      ownerVerified: true,
      hidden: false,
      expiresAt: new Date(Date.now() + 86400000),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Cannot claim own post
    const own = await request(app).post('/api/lostfound/items').send({
      type: 'found',
      title: 'My Own Found Post',
      description: 'Found near C1 food court.',
      category: 'other',
      location: 'C1',
    });
    const selfClaim = await request(app).post(`/api/lostfound/items/${own.body.item.id}/claims`).send({ message: 'It is mine' });
    expect(selfClaim.status).toBe(400);

    // Submit claim on Ayesha's post
    const claimRes = await request(app)
      .post(`/api/lostfound/items/${otherId}/claims`)
      .send({ message: 'Has a green keycap and SEECS tag' });
    expect(claimRes.status).toBe(201);

    // Non-owner cannot approve
    const badApprove = await request(app).patch(`/api/lostfound/claims/${claimRes.body.claim.id}`).send({ action: 'approved' });
    expect(badApprove.status).toBe(403);

    // Simulate owner approving on a post owned by demo-ahmed-khan
    const myFound = await request(app).post('/api/lostfound/items').send({
      type: 'found',
      title: 'Black Umbrella',
      description: 'Left outside NBS seminar hall.',
      category: 'accessories',
      location: 'NBS',
    });
    const incomingClaim = {
      _id: mockMakeId(),
      itemId: myFound.body.item.id,
      claimantId: 'student-55',
      claimantName: 'Sara Khan',
      claimantVerified: true,
      message: 'Has wooden handle',
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockClaimStore.push(incomingClaim);

    const approve = await request(app)
      .patch(`/api/lostfound/claims/${incomingClaim._id}`)
      .send({ action: 'approved' });
    expect(approve.status).toBe(200);
    expect(approve.body.claim.status).toBe('approved');
    expect(approve.body.item.status).toBe('claimed');
  });

  test('moderationHooks hide/restore hides from students and searchProvider', async () => {
    const created = await request(app).post('/api/lostfound/items').send({
      type: 'lost',
      title: 'Lab Coat',
      description: 'Lost white lab coat in SCME.',
      category: 'other',
      location: 'SCME',
    });
    const id = created.body.item.id;

    expect((await manifest.searchProvider('Lab Coat', { limit: 5 })).length).toBe(1);
    await manifest.moderationHooks.hide(id);

    const hiddenFetch = await request(app).get(`/api/lostfound/items/${id}`);
    expect(hiddenFetch.status).toBe(404);
    expect((await manifest.searchProvider('Lab Coat', { limit: 5 })).length).toBe(0);

    await manifest.moderationHooks.restore(id);
    const restoredFetch = await request(app).get(`/api/lostfound/items/${id}`);
    expect(restoredFetch.status).toBe(200);
  });

  test('summaryProvider and findMatchesForItem work cleanly', async () => {
    await request(app).post('/api/lostfound/items').send({
      type: 'lost',
      title: 'Arduino Uno Kit',
      description: 'Lost electronics kit near SEECS.',
      category: 'electronics',
      location: 'SEECS',
    });
    const userSum = await manifest.summaryProvider('demo-ahmed-khan');
    expect(userSum.stat.value).toBe(1);
    expect(userSum.recent).toHaveLength(1);

    const globalSum = await manifest.summaryProvider(null, { scope: 'all' });
    expect(globalSum.stat.value).toBe(1);
    expect(globalSum.recent).toEqual([]);

    const matches = findMatchesForItem(
      { id: '1', type: 'lost', category: 'electronics', title: 'Arduino Kit', location: 'SEECS', eventDate: new Date() },
      [{ id: '2', type: 'found', category: 'electronics', title: 'Found Arduino Kit', location: 'SEECS', status: 'open', eventDate: new Date() }],
    );
    expect(matches).toHaveLength(1);
    expect(matches[0].score).toBeGreaterThanOrEqual(50);
  });
});
