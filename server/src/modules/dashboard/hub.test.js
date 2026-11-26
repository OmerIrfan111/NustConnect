process.env.NODE_ENV = 'test';
process.env.VITE_DEV_FAKE_AUTH = 'true';

// The notification model is imported by the dashboard manifest, so give it a stand-in (these tests never touch it).
jest.mock('./models/Notification', () => ({}));

const request = require('supertest');
const { createApp } = require('../../core/app');
const { search, summary } = require('./aggregate');

/** App with extra fake modules registered in the loader's registry, exactly where real manifests live. */
function appWith(modules, timeoutMs = 80) {
  const app = createApp();
  // Only the fake modules: real modules merged into the repo must not change what these tests see.
  app.locals.modules.clear();
  modules.forEach((m) => app.locals.modules.set(m.slug, m));
  app.locals.providerTimeoutMs = timeoutMs;
  return app;
}

const hit = (id, title, type, url) => ({ id, title, snippet: `${title} snippet`, type, url });
const rides = { slug: 'rideshare', searchProvider: async (q) => [hit('1', `Ride to ${q}`, 'ride', '/rides/1')] };
const market = {
  slug: 'marketplace',
  searchProvider: async (q) => [hit('9', `${q} kit`, 'item', '/marketplace/9'), hit('10', `${q} book`, 'book', '/marketplace/10')],
};

describe('search aggregation', () => {
  test('groups results by module and lists the available types', async () => {
    const res = await request(appWith([rides, market])).get('/api/dashboard/search?q=arduino');
    expect(res.status).toBe(200);
    expect(res.body.groups.map((g) => g.module)).toEqual(['marketplace', 'rideshare']);
    expect(res.body.total).toBe(3);
    expect(res.body.types).toEqual(['book', 'item', 'ride']);
    expect(res.body.skipped).toEqual([]);
  });

  test('type filter keeps only matching results', async () => {
    const res = await request(appWith([rides, market])).get('/api/dashboard/search?q=arduino&type=book');
    expect(res.body.groups).toHaveLength(1);
    expect(res.body.groups[0].results.map((r) => r.id)).toEqual(['10']);
  });

  test('modules without a provider are skipped, with no crash (QA-2)', async () => {
    const noProvider = { slug: 'campus' };
    const res = await request(appWith([rides, noProvider])).get('/api/dashboard/search?q=map');
    expect(res.status).toBe(200);
    expect(res.body.groups.map((g) => g.module)).toEqual(['rideshare']);
  });

  test('a provider that throws or is too slow is skipped and the others still answer', async () => {
    const broken = { slug: 'reviews', searchProvider: async () => { throw new Error('db down'); } };
    const slow = { slug: 'support', searchProvider: () => new Promise((r) => setTimeout(() => r([hit('1', 'late', 'faq', '/faq/1')]), 1000)) };
    const res = await request(appWith([rides, broken, slow])).get('/api/dashboard/search?q=help');
    expect(res.status).toBe(200);
    expect(res.body.groups.map((g) => g.module)).toEqual(['rideshare']);
    expect(res.body.skipped.sort()).toEqual(['reviews', 'support']);
  });

  test('responds well inside 2 s even when a provider hangs (QA-2)', async () => {
    const hang = { slug: 'lostfound', searchProvider: () => new Promise(() => {}) };
    const t0 = Date.now();
    const res = await request(appWith([rides, hang], 300)).get('/api/dashboard/search?q=wallet');
    expect(res.status).toBe(200);
    expect(Date.now() - t0).toBeLessThan(2000);
  });

  test('off-site and malformed result URLs are dropped; text is truncated', async () => {
    const evil = {
      slug: 'support',
      searchProvider: async () => [
        hit('1', 'ok', 'faq', '/faq/1'),
        hit('2', 'phish', 'faq', 'https://evil.com'),
        hit('3', 'proto-relative', 'faq', '//evil.com'),
        { id: '4', title: 'x'.repeat(500), snippet: 'y'.repeat(900), type: 'faq', url: '/faq/4' },
      ],
    };
    const { groups } = await search(new Map([['support', evil]]), 'faq');
    expect(groups[0].results.map((r) => r.id)).toEqual(['1', '4']);
    expect(groups[0].results[1].title).toHaveLength(140);
    expect(groups[0].results[1].snippet).toHaveLength(240);
  });

  test('a short query is a 400, and a session is required', async () => {
    expect((await request(appWith([rides])).get('/api/dashboard/search?q=a')).status).toBe(400);
    // Build an app with no fake session in an isolated module registry, so the config cached for the other tests is untouched.
    let anon;
    jest.isolateModules(() => {
      delete process.env.VITE_DEV_FAKE_AUTH;
      jest.doMock('./models/Notification', () => ({}));
      anon = require('../../core/app').createApp();
      process.env.VITE_DEV_FAKE_AUTH = 'true';
    });
    expect((await request(anon).get('/api/dashboard/search?q=ab')).status).toBe(401);
  });

  test('per-module result cap is applied', async () => {
    const many = { slug: 'reviews', searchProvider: async () => Array.from({ length: 40 }, (_, i) => hit(String(i), `r${i}`, 'review', `/reviews/${i}`)) };
    const { groups } = await search(new Map([['reviews', many]]), 'rev', { limit: 5 });
    expect(groups[0].results).toHaveLength(5);
  });
});

describe('summary aggregation', () => {
  const day = (n) => new Date(Date.UTC(2026, 10, n)).toISOString();
  const withSummary = (slug, label, value, recent) => ({ slug, summaryProvider: async () => ({ stat: { label, value }, recent }) });

  test('collects stats and merges recent activity newest first', async () => {
    const a = withSummary('rideshare', 'Active Rides', 3, [{ text: 'Seat accepted', url: '/rides/1', at: day(20) }]);
    const b = withSummary('marketplace', 'Marketplace Listings', '7', [{ text: 'Listed kit', url: '/marketplace/1', at: day(22) }]);
    const res = await request(appWith([a, b])).get('/api/dashboard/summary');
    expect(res.status).toBe(200);
    expect(res.body.stats).toEqual([
      { module: 'marketplace', label: 'Marketplace Listings', value: 7 },
      { module: 'rideshare', label: 'Active Rides', value: 3 },
    ].sort((x, y) => res.body.stats.findIndex((s) => s.module === x.module) - res.body.stats.findIndex((s) => s.module === y.module)));
    expect(res.body.recent.map((r) => r.text)).toEqual(['Listed kit', 'Seat accepted']);
  });

  test('missing, failing and malformed providers are skipped', async () => {
    const good = withSummary('rideshare', 'Active Rides', 3, []);
    const broken = { slug: 'reviews', summaryProvider: async () => { throw new Error('x'); } };
    const junk = { slug: 'support', summaryProvider: async () => 'nonsense' };
    const badStat = withSummary('campus', 'Bills', 'many', []);
    const res = await request(appWith([good, broken, junk, badStat, { slug: 'lostfound' }])).get('/api/dashboard/summary');
    expect(res.body.stats.map((s) => s.module)).toEqual(['rideshare']);
    expect(res.body.skipped.sort()).toEqual(['reviews', 'support']);
  });

  test('recent activity is capped at 8 and unsafe URLs are blanked', async () => {
    const many = { slug: 'rideshare', summaryProvider: async () => ({ stat: { label: 'Active Rides', value: 1 }, recent: Array.from({ length: 12 }, (_, i) => ({ text: `e${i}`, url: i === 0 ? 'https://evil.com' : '/rides', at: day(i + 1) })) }) };
    const { recent } = await summary(new Map([['rideshare', many]]), 'u1');
    expect(recent).toHaveLength(8);
    expect(recent.find((r) => r.text === 'e0')).toBeUndefined(); // oldest dropped by the cap
    const unsafe = await summary(new Map([['rideshare', { slug: 'rideshare', summaryProvider: async () => ({ recent: [{ text: 'x', url: '//evil.com', at: day(1) }] }) }]]), 'u1');
    expect(unsafe.recent[0].url).toBe('');
  });

  test('the provider receives the signed-in user id', async () => {
    const spy = jest.fn(async () => ({ stat: { label: 'Active Rides', value: 1 }, recent: [] }));
    await request(appWith([{ slug: 'rideshare', summaryProvider: spy }])).get('/api/dashboard/summary');
    expect(spy).toHaveBeenCalledWith('demo-ahmed-khan');
  });
});
