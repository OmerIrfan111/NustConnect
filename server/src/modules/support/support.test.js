process.env.NODE_ENV = 'test';
process.env.VITE_DEV_FAKE_AUTH = 'true';
process.env.VITE_DEV_FAKE_ROLE = 'student';

const request = require('supertest');
const mongoose = require('mongoose');

const mockComplaints = [];
const mockHistory = [];
const mockHelpBox = [];
const mockFaqs = [];
const mockNotify = jest.fn();

jest.mock('../dashboard/notify', () => ({ notify: (...args) => mockNotify(...args) }));

const mockId = () => new mongoose.Types.ObjectId().toString();

function mockMatches(doc, query = {}) {
  for (const [k, v] of Object.entries(query)) {
    if (k === '$or') {
      if (!v.some((sub) => mockMatches(doc, sub))) return false;
      continue;
    }
    if (v && typeof v === 'object' && !(v instanceof Date) && !Array.isArray(v)) {
      if ('$ne' in v && doc[k] === v.$ne) return false;
      if ('$gte' in v && !(new Date(doc[k]) >= new Date(v.$gte))) return false;
      if ('$in' in v && !v.$in.includes(doc[k])) return false;
      if ('$regex' in v) {
        const re = new RegExp(v.$regex, v.$options || '');
        const val = Array.isArray(doc[k]) ? doc[k].join(' ') : String(doc[k] || '');
        if (!re.test(val)) return false;
      }
      continue;
    }
    if (String(doc[k]) !== String(v)) return false;
  }
  return true;
}

function mockMakeChain(rows, wrapper) {
  let list = [...rows];
  const chain = {
    sort(spec = {}) {
      const asc = spec.createdAt === 1;
      list.sort((a, b) => (asc ? new Date(a.createdAt) - new Date(b.createdAt) : new Date(b.createdAt) - new Date(a.createdAt)));
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

function mockWrapComplaint(raw) {
  return {
    ...raw,
    toPublic() {
      return {
        id: String(this._id),
        ownerId: this.ownerId,
        ownerName: this.ownerName,
        category: this.category,
        title: this.title,
        description: this.description,
        location: this.location,
        photo: this.photo || '',
        status: this.status,
        assignedTo: this.assignedTo || '',
        isSample: Boolean(this.isSample),
        createdAt: this.createdAt,
        updatedAt: this.updatedAt,
      };
    },
    async save() {
      const idx = mockComplaints.findIndex((c) => String(c._id) === String(this._id));
      this.updatedAt = new Date();
      if (idx >= 0) mockComplaints[idx] = { ...this };
      return this;
    },
  };
}

function mockWrapHistory(raw) {
  return {
    ...raw,
    toPublic() {
      return {
        id: String(this._id),
        complaintId: String(this.complaintId),
        fromStatus: this.fromStatus || '',
        toStatus: this.toStatus,
        actorId: this.actorId,
        actorName: this.actorName,
        actorRole: this.actorRole,
        note: this.note || '',
        createdAt: this.createdAt,
      };
    },
  };
}

function mockWrapHelpBox(raw) {
  return {
    ...raw,
    toPublic() {
      return {
        id: String(this._id),
        category: this.category,
        question: this.question,
        status: this.status,
        answer: this.answer || '',
        answeredAt: this.answeredAt || null,
        publishedFaqId: this.publishedFaqId || '',
        isSample: Boolean(this.isSample),
        createdAt: this.createdAt,
      };
    },
    async save() {
      const idx = mockHelpBox.findIndex((h) => String(h._id) === String(this._id));
      if (idx >= 0) mockHelpBox[idx] = { ...this };
      return this;
    },
  };
}

function mockWrapFaq(raw) {
  return {
    ...raw,
    toPublic() {
      return {
        id: String(this._id),
        title: this.title,
        category: this.category,
        body: this.body,
        tags: this.tags || [],
        hidden: Boolean(this.hidden),
        isSample: Boolean(this.isSample),
        createdAt: this.createdAt,
        updatedAt: this.updatedAt,
      };
    },
    async save() {
      const idx = mockFaqs.findIndex((f) => String(f._id) === String(this._id));
      this.updatedAt = new Date();
      if (idx >= 0) mockFaqs[idx] = { ...this };
      return this;
    },
  };
}

jest.mock('./models/Complaint', () => ({
  COMPLAINT_CATEGORIES: ['electrical', 'plumbing', 'internet', 'hostel', 'classroom', 'cleanliness', 'security', 'other'],
  COMPLAINT_STATUSES: ['submitted', 'under_review', 'assigned', 'in_progress', 'resolved', 'reopened'],
  ALLOWED_TRANSITIONS: {
    submitted: ['under_review', 'assigned', 'in_progress', 'resolved'],
    under_review: ['assigned', 'in_progress', 'resolved'],
    assigned: ['in_progress', 'resolved'],
    in_progress: ['resolved'],
    resolved: ['reopened'],
    reopened: ['under_review', 'assigned', 'in_progress', 'resolved'],
  },
  find: (q = {}) => mockMakeChain(mockComplaints.filter((d) => mockMatches(d, q)), mockWrapComplaint),
  countDocuments: async (q = {}) => mockComplaints.filter((d) => mockMatches(d, q)).length,
  findById: async (id) => {
    const hit = mockComplaints.find((d) => String(d._id) === String(id));
    return hit ? mockWrapComplaint(hit) : null;
  },
  create: async (data) => {
    const now = new Date();
    const doc = { _id: mockId(), status: 'submitted', assignedTo: '', photo: '', createdAt: now, updatedAt: now, ...data };
    mockComplaints.push(doc);
    return mockWrapComplaint(doc);
  },
  deleteMany: async (q) => {
    let deletedCount = 0;
    for (let i = mockComplaints.length - 1; i >= 0; i -= 1) {
      if (mockMatches(mockComplaints[i], q)) {
        mockComplaints.splice(i, 1);
        deletedCount += 1;
      }
    }
    return { deletedCount };
  },
}));

jest.mock('./models/ComplaintHistory', () => ({
  find: (q = {}) => mockMakeChain(mockHistory.filter((d) => mockMatches(d, q)), mockWrapHistory),
  create: async (data) => {
    const doc = { _id: mockId(), createdAt: new Date(), ...data };
    mockHistory.push(doc);
    return mockWrapHistory(doc);
  },
  deleteMany: async (q) => {
    for (let i = mockHistory.length - 1; i >= 0; i -= 1) {
      if (mockMatches(mockHistory[i], q)) mockHistory.splice(i, 1);
    }
  },
}));

jest.mock('./models/HelpBox', () => ({
  HELPBOX_CATEGORIES: ['academics', 'hostels', 'transport', 'mental_health', 'administration', 'campus_life', 'other'],
  HELPBOX_STATUSES: ['open', 'answered', 'dismissed'],
  find: (q = {}) => mockMakeChain(mockHelpBox.filter((d) => mockMatches(d, q)), mockWrapHelpBox),
  findById: async (id) => {
    const hit = mockHelpBox.find((d) => String(d._id) === String(id));
    return hit ? mockWrapHelpBox(hit) : null;
  },
  create: async (data) => {
    const doc = { _id: mockId(), status: 'open', answer: '', answeredAt: null, publishedFaqId: '', createdAt: new Date(), ...data };
    mockHelpBox.push(doc);
    return mockWrapHelpBox(doc);
  },
}));

jest.mock('./models/Faq', () => ({
  FAQ_CATEGORIES: ['academics', 'hostels', 'transport', 'it_lms', 'fees_scholarships', 'campus_life', 'general'],
  find: (q = {}) => mockMakeChain(mockFaqs.filter((d) => mockMatches(d, q)), mockWrapFaq),
  findById: async (id) => {
    const hit = mockFaqs.find((d) => String(d._id) === String(id));
    return hit ? mockWrapFaq(hit) : null;
  },
  findByIdAndUpdate: async (id, update) => {
    const hit = mockFaqs.find((d) => String(d._id) === String(id));
    if (!hit) return null;
    Object.assign(hit, update.$set || update);
    return mockWrapFaq(hit);
  },
  create: async (data) => {
    const now = new Date();
    const doc = { _id: mockId(), hidden: false, tags: [], createdAt: now, updatedAt: now, ...data };
    mockFaqs.push(doc);
    return mockWrapFaq(doc);
  },
  deleteOne: async (q) => {
    const idx = mockFaqs.findIndex((d) => mockMatches(d, q));
    if (idx >= 0) {
      mockFaqs.splice(idx, 1);
      return { deletedCount: 1 };
    }
    return { deletedCount: 0 };
  },
}));

function buildApp(role = 'student') {
  jest.resetModules();
  process.env.NODE_ENV = 'test';
  process.env.VITE_DEV_FAKE_AUTH = 'true';
  process.env.VITE_DEV_FAKE_ROLE = role;
  const { createApp } = require('../../core/app');
  const manifest = require('./index');
  const { checkAnonymousRateLimit, _memoryHits } = require('./controllers/helpBoxController');
  return { app: createApp(), manifest, checkAnonymousRateLimit, _memoryHits };
}

beforeEach(() => {
  mockComplaints.length = 0;
  mockHistory.length = 0;
  mockHelpBox.length = 0;
  mockFaqs.length = 0;
});

describe('Complaint Tracker access control & workflow (QA-1..QA-3)', () => {
  test('submit complaint, enforce owner/staff access (403 to others), and validate transitions', async () => {
    const { app } = buildApp('student');
    const created = await request(app).post('/api/support/complaints').send({
      category: 'electrical',
      title: 'Broken AC in SEECS',
      description: 'The air conditioner in Room 102 is leaking water.',
      location: 'SEECS Room 102',
    });
    expect(created.status).toBe(201);
    expect(created.body.complaint.status).toBe('submitted');
    expect(created.body.history).toHaveLength(1);

    const otherId = mockId();
    mockComplaints.push({
      _id: otherId,
      ownerId: 'someone-else',
      ownerName: 'Ayesha',
      category: 'internet',
      title: 'Wi-Fi slow in Hostel',
      description: 'Eduroam drops frequently.',
      location: 'Fatima Hostel',
      status: 'submitted',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const denied = await request(app).get(`/api/support/complaints/${otherId}`);
    expect(denied.status).toBe(403);

    // Student cannot transition own submitted complaint to resolved
    const studentTry = await request(app).patch(`/api/support/complaints/${created.body.complaint.id}/status`).send({ status: 'resolved' });
    expect(studentTry.status).toBe(403);

    // Staff transitions complaint with history entry; invalid transition rejected
    const { app: modApp } = buildApp('moderator');
    const invalid = await request(modApp)
      .patch(`/api/support/complaints/${created.body.complaint.id}/status`)
      .send({ status: 'reopened' });
    expect(invalid.status).toBe(400);

    const valid = await request(modApp)
      .patch(`/api/support/complaints/${created.body.complaint.id}/status`)
      .send({ status: 'in_progress', assignedTo: 'Electrical Team', note: 'Technician dispatched' });
    expect(valid.status).toBe(200);
    expect(valid.body.complaint.status).toBe('in_progress');
    expect(valid.body.history).toHaveLength(2);
    expect(valid.body.history[1].actorRole).toBe('moderator');
  });
});

describe('Anonymous Help Box privacy & FAQ publishing (QA-1..QA-3)', () => {
  test('Help Box stores ZERO identity fields even when user is signed in', async () => {
    const { app } = buildApp('student');
    const res = await request(app).post('/api/support/helpbox').send({
      category: 'mental_health',
      question: 'Where can I book a confidential campus counseling session?',
      userId: 'attacker-spoof',
    });
    expect(res.status).toBe(201);

    const stored = mockHelpBox[0];
    expect(stored.ownerId).toBeUndefined();
    expect(stored.userId).toBeUndefined();
    expect(stored.ip).toBeUndefined();
    expect(stored.email).toBeUndefined();
    expect(JSON.stringify(stored)).not.toContain('demo-ahmed-khan');
    expect(JSON.stringify(stored)).not.toContain('attacker-spoof');
  });

  test('Help Box in-memory rate limit blocks excessive anonymous submissions without DB identity', () => {
    const { checkAnonymousRateLimit, _memoryHits } = buildApp('student');
    _memoryHits.clear();
    const fakeReq = { ip: '10.0.0.5' };
    for (let i = 0; i < 5; i += 1) {
      checkAnonymousRateLimit(fakeReq, { force: true });
    }
    expect(() => checkAnonymousRateLimit(fakeReq, { force: true })).toThrow(/Too many anonymous questions/i);
  });

  test('Moderator answers Help Box question and publishes as FAQ without exposing asker', async () => {
    const { app } = buildApp('student');
    const sub = await request(app).post('/api/support/helpbox').send({
      category: 'academics',
      question: 'How late is the central library open during finals?',
    });
    const { app: modApp } = buildApp('moderator');
    const ans = await request(modApp).post(`/api/support/helpbox/${sub.body.entry.id}/answer`).send({
      answer: 'During finals week the Central Library stays open until midnight.',
      publishAsFaq: true,
      faqTitle: 'Library Finals Timings',
      faqCategory: 'campus_life',
    });
    expect(ans.status).toBe(200);
    expect(ans.body.faq.title).toBe('Library Finals Timings');
    expect(ans.body.entry.publishedFaqId).toBe(ans.body.faq.id);
  });
});

describe('FAQ, Search, Summary & Moderation Contracts (QA-1..QA-3)', () => {
  test('searchProvider returns FAQ only (never complaints or helpbox) and respects hide/restore', async () => {
    const { app } = buildApp('student');
    await request(app).post('/api/support/complaints').send({
      category: 'security',
      title: 'Private Secret Complaint Keyword',
      description: 'This private complaint must never show up in search.',
      location: 'Gate 1',
    });
    await request(app).post('/api/support/helpbox').send({
      category: 'other',
      question: 'Private Secret HelpBox Question Keyword?',
    });

    const { app: modApp, manifest } = buildApp('moderator');
    const faqRes = await request(modApp).post('/api/support/faq').send({
      title: 'Secret Library Guide',
      category: 'general',
      body: 'How to reserve study rooms in the Central Library.',
      tags: ['library', 'study'],
    });
    expect(faqRes.status).toBe(201);

    const results = await manifest.searchProvider('Secret', { limit: 10 });
    expect(results).toHaveLength(1);
    expect(results[0].type).toBe('faq');
    expect(results[0].url).toBe(`/faq/${faqRes.body.article.id}`);

    await manifest.moderationHooks.hide(faqRes.body.article.id);
    expect(await manifest.searchProvider('Secret', { limit: 10 })).toHaveLength(0);
    await manifest.moderationHooks.restore(faqRes.body.article.id);
    expect(await manifest.searchProvider('Secret', { limit: 10 })).toHaveLength(1);
  });

  test('summaryProvider computes resolution % for platform and personal stats for user', async () => {
    const { app } = buildApp('student');
    await request(app).post('/api/support/complaints').send({
      category: 'plumbing',
      title: 'Leaking tap',
      description: 'Washroom tap leaking on 1st floor.',
      location: 'SMME',
    });
    const c2 = await request(app).post('/api/support/complaints').send({
      category: 'internet',
      title: 'No Wi-Fi',
      description: 'Router offline in hostel block.',
      location: 'Attar Hostel',
    });
    const { app: modApp, manifest } = buildApp('moderator');
    await request(modApp).patch(`/api/support/complaints/${c2.body.complaint.id}/status`).send({ status: 'under_review' });

    const platform = await manifest.summaryProvider(null, { scope: 'all' });
    expect(platform.stat.value).toBe(50);

    const mine = await manifest.summaryProvider('demo-ahmed-khan');
    expect(mine.stat.value).toBe(2);
    expect(mine.recent).toHaveLength(2);
  });
});
