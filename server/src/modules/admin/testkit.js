/**
 * Test helper (not shipped code): an in-memory stand-in for Mongoose models, installed on `global` so `jest.mock` factories
 * can use it. Rows live on `global.__adminDb` so they survive `jest.resetModules()`.
 * Usage in a test file, BEFORE anything that loads the models:  require('./testkit');
 */
global.__adminDb = global.__adminDb || {};
let seq = 0;
let clock = 1;
global.__nextId = () => (++seq).toString(16).padStart(24, '0');

const matches = (row, q = {}) =>
  Object.entries(q).every(([k, v]) => {
    if (k === '$or') return v.some((sub) => matches(row, sub));
    if (v instanceof RegExp) return v.test(row[k]);
    if (v && typeof v === 'object' && '$ne' in v) return row[k] !== v.$ne;
    if (v && typeof v === 'object' && '$in' in v) return v.$in.includes(row[k]);
    return String(row[k]) === String(v);
  });

global.__mk = (collection, publicOf, defaults = () => ({})) => {
  const rows = (global.__adminDb[collection] = global.__adminDb[collection] || []);
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
    find: (q) => chain(rows.filter((r) => matches(r, q))),
    findOne: async (q) => wrap(rows.find((r) => matches(r, q))),
    findById: async (id) => wrap(rows.find((r) => r._id === id)),
    countDocuments: async (q) => rows.filter((r) => matches(r, q)).length,
  };
};

/** Fresh app whose session stub is the demo user in `role` (or no session when null), plus extra fake modules. */
global.__appAs = (role, modules = []) => {
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
};

global.__clearDb = () => Object.keys(global.__adminDb).forEach((k) => (global.__adminDb[k].length = 0));
