import { describe, expect, it } from 'vitest';
import { buildRegistry, registry, slugFromPath, visibleFor } from './registry.js';

const C = () => null;
const mod = (slug, extra = {}) => ({
  [`../../modules/${slug}/module.config.js`]: { default: { slug, title: slug, ...extra } },
});

describe('slugFromPath', () => {
  it('extracts the folder name', () => {
    expect(slugFromPath('../../modules/rideshare/module.config.js')).toBe('rideshare');
    expect(slugFromPath('nope.js')).toBeNull();
  });
});

describe('buildRegistry', () => {
  it('collects nav, routes and slots from every manifest', () => {
    const r = buildRegistry({
      ...mod('b', {
        nav: [{ label: 'B', path: '/b', order: 20 }],
        routes: [{ path: '/b', component: C }],
      }),
      ...mod('a', {
        nav: [
          { label: 'A', path: '/a', order: 10 },
          { label: 'A more', path: '/a2', group: 'more', order: 5 },
        ],
        publicRoutes: [{ path: '/a', component: C }],
        slots: { topbarSearch: C },
      }),
    });
    expect(r.errors).toEqual([]);
    expect(r.nav.main.map((n) => n.label)).toEqual(['A', 'B']);
    expect(r.nav.more.map((n) => n.label)).toEqual(['A more']);
    expect(r.routes).toHaveLength(1);
    expect(r.routes[0].module).toBe('b');
    expect(r.publicRoutes[0].module).toBe('a');
    expect(r.slots.topbarSearch).toBe(C);
  });

  it('rejects a manifest whose slug does not match its folder', () => {
    const r = buildRegistry({ '../../modules/x/module.config.js': { default: { slug: 'y' } } });
    expect(r.modules).toHaveLength(0);
    expect(r.errors[0]).toMatch(/must match folder/);
  });

  it('reports duplicate route paths across modules', () => {
    const r = buildRegistry({
      ...mod('a', { routes: [{ path: '/same', component: C }] }),
      ...mod('b', { routes: [{ path: '/same', component: C }] }),
    });
    expect(r.errors.some((e) => e.includes('/same'))).toBe(true);
  });

  it('reports unknown and duplicate slots', () => {
    const r = buildRegistry({
      ...mod('a', { slots: { topbarSearch: C, bogus: C } }),
      ...mod('b', { slots: { topbarSearch: C } }),
    });
    expect(r.errors.some((e) => e.includes('unknown slot "bogus"'))).toBe(true);
    expect(r.errors.some((e) => e.includes('more than one module'))).toBe(true);
  });
});

describe('visibleFor', () => {
  it('hides role-restricted items from other roles', () => {
    const items = [{ label: 'All' }, { label: 'Admin', roles: ['admin'] }];
    expect(visibleFor(items, 'student').map((i) => i.label)).toEqual(['All']);
    expect(visibleFor(items, 'admin').map((i) => i.label)).toEqual(['All', 'Admin']);
  });
});

describe('real module manifests', () => {
  it('discovers all 9 modules with no errors', () => {
    expect(registry.errors).toEqual([]);
    expect(registry.modules.map((m) => m.slug)).toEqual([
      'admin',
      'auth',
      'campus',
      'dashboard',
      'lostfound',
      'marketplace',
      'reviews',
      'rideshare',
      'support',
    ]);
  });

  it('exposes the 12 designed sidebar items in design order', () => {
    expect(registry.nav.main.map((n) => n.label)).toEqual([
      'Dashboard',
      'RideShare',
      'Marketplace',
      'Review Hub',
      'Opportunities',
      'Campus Map',
      'Lost & Found',
      'Help Box',
      'Complaints',
      'Bill Splitting',
      'Notifications',
      'Settings',
    ]);
  });
});
