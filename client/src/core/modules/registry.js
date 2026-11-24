/**
 * Module registry — discovers every module manifest with a glob, so adding a module never
 * means editing a central list (docs/PROJECT_PLAN.md §2.1, docs/CONTRACTS.md §1).
 *
 * Manifest shape (client/src/modules/<slug>/module.config.js, default export):
 * {
 *   slug: 'rideshare',                 // must equal the folder name
 *   title: 'RideShare',
 *   nav: [{ label, path, icon, group: 'main' | 'more', order, roles? }],
 *   routes: [{ path, component, title?, roles? }],          // signed-in only, rendered in AppShell
 *   publicRoutes: [{ path, component, title?, layout? }],   // guests allowed; layout: 'adaptive' (default) | 'bare'
 *   adminRoutes: [{ label, path, component, roles? }],      // rendered inside the admin layout (A3)
 *   slots: { topbarSearch?, topbarNotifications?, adminLayout? },
 * }
 */

export const SLOT_NAMES = ['topbarSearch', 'topbarNotifications', 'adminLayout'];
export const DEFAULT_ADMIN_ROLES = ['admin', 'moderator'];

const warn = (msg) => {
  if (import.meta.env?.MODE !== 'test') console.warn(`[modules] ${msg}`);
};

/** Extract the folder slug from a glob key such as '../../modules/rideshare/module.config.js'. */
export function slugFromPath(path) {
  const match = path.match(/modules\/([^/]+)\/module\.config\.js$/);
  return match ? match[1] : null;
}

/**
 * Build the registry from a glob result ({ [path]: moduleNamespace }).
 * Pure function so it can be unit-tested with fake manifests.
 */
export function buildRegistry(globResult) {
  const modules = [];
  const errors = [];

  for (const [path, ns] of Object.entries(globResult)) {
    const folder = slugFromPath(path);
    const manifest = ns?.default ?? ns;
    if (!manifest || typeof manifest !== 'object') {
      errors.push(`${path}: no default export`);
      continue;
    }
    if (manifest.slug !== folder) {
      errors.push(`${path}: slug "${manifest.slug}" must match folder "${folder}"`);
      continue;
    }
    modules.push({
      slug: manifest.slug,
      title: manifest.title ?? manifest.slug,
      nav: manifest.nav ?? [],
      routes: manifest.routes ?? [],
      publicRoutes: manifest.publicRoutes ?? [],
      adminRoutes: manifest.adminRoutes ?? [],
      slots: manifest.slots ?? {},
    });
  }

  modules.sort((a, b) => a.slug.localeCompare(b.slug));

  const tag = (items, slug) => items.map((item) => ({ ...item, module: slug }));

  const nav = modules
    .flatMap((m) => tag(m.nav, m.slug))
    .map((item) => ({ group: 'main', order: 1000, ...item }))
    .sort((a, b) => a.order - b.order || a.label.localeCompare(b.label));

  const routes = modules.flatMap((m) => tag(m.routes, m.slug));
  const publicRoutes = modules.flatMap((m) => tag(m.publicRoutes, m.slug));
  const adminRoutes = modules.flatMap((m) => tag(m.adminRoutes, m.slug));

  // Duplicate path detection across all route kinds.
  const seen = new Map();
  for (const r of [...routes, ...publicRoutes, ...adminRoutes]) {
    if (seen.has(r.path)) {
      errors.push(`route "${r.path}" declared by both "${seen.get(r.path)}" and "${r.module}"`);
    } else {
      seen.set(r.path, r.module);
    }
    if (typeof r.component !== 'function' && typeof r.component !== 'object') {
      errors.push(`route "${r.path}" (${r.module}) has no component`);
    }
  }

  // Slots: first provider wins (alphabetical by slug); duplicates are reported.
  const slots = {};
  for (const m of modules) {
    for (const [name, component] of Object.entries(m.slots)) {
      if (!SLOT_NAMES.includes(name)) {
        errors.push(`${m.slug}: unknown slot "${name}" (allowed: ${SLOT_NAMES.join(', ')})`);
      } else if (slots[name]) {
        errors.push(`slot "${name}" provided by more than one module; using "${slots[name].module}"`);
      } else {
        slots[name] = { component, module: m.slug };
      }
    }
  }

  return {
    modules,
    nav: {
      main: nav.filter((n) => n.group !== 'more'),
      more: nav.filter((n) => n.group === 'more'),
    },
    routes,
    publicRoutes,
    adminRoutes,
    slots: Object.fromEntries(Object.entries(slots).map(([k, v]) => [k, v.component])),
    errors,
  };
}

/** Filter nav items by the current user's role (items without `roles` are visible to everyone signed in). */
export function visibleFor(items, role) {
  return items.filter((item) => !item.roles || (role && item.roles.includes(role)));
}

const discovered = import.meta.glob('../../modules/*/module.config.js', { eager: true });

export const registry = buildRegistry(discovered);

registry.errors.forEach(warn);
